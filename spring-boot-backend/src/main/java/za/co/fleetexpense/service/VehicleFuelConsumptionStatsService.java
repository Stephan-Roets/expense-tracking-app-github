package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.FuelConsumptionAlertDTO;
import za.co.fleetexpense.dto.VehicleFuelConsumptionStatsDTO;
import za.co.fleetexpense.entity.FuelLog;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleFuelConsumptionStats;
import za.co.fleetexpense.mapper.VehicleFuelConsumptionStatsMapper;
import za.co.fleetexpense.repository.FuelLogRepository;
import za.co.fleetexpense.repository.VehicleFuelConsumptionStatsRepository;
import za.co.fleetexpense.repository.VehicleRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleFuelConsumptionStatsService {

    private static final BigDecimal DEGRADATION_THRESHOLD_PERCENT = BigDecimal.valueOf(15);
    private static final int RECENT_FILLS_COUNT = 3;

    private final VehicleFuelConsumptionStatsRepository statsRepository;
    private final VehicleRepository vehicleRepository;
    private final FuelLogRepository fuelLogRepository;
    private final VehicleFuelConsumptionStatsMapper statsMapper;

    @Transactional(readOnly = true)
    public Optional<VehicleFuelConsumptionStatsDTO> getStatsByVehicleId(UUID vehicleId) {
        return statsRepository.findByVehicleId(vehicleId)
                .map(statsMapper::toDTO);
    }

    @Transactional
    public VehicleFuelConsumptionStats recalculateStats(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        VehicleFuelConsumptionStats stats = statsRepository.findByVehicleId(vehicleId)
                .orElse(VehicleFuelConsumptionStats.builder()
                        .organization(vehicle.getOrganization())
                        .vehicle(vehicle)
                        .build());

        List<FuelLog> allLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);
        List<FuelLog> nonBaseline = allLogs.stream()
                .filter(fl -> !Boolean.TRUE.equals(fl.getIsBaselineFill()))
                .collect(Collectors.toList());

        // Totals
        int totalLogs = allLogs.size();
        int totalFullTankFills = (int) allLogs.stream().filter(fl -> Boolean.TRUE.equals(fl.getFullTank())).count();

        BigDecimal totalLiters = allLogs.stream()
                .map(fl -> fl.getLiters() != null ? fl.getLiters() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalDistanceKm = nonBaseline.stream()
                .mapToInt(fl -> fl.getKmSinceLastFill() != null ? fl.getKmSinceLastFill() : 0)
                .sum();

        BigDecimal totalFuelCost = allLogs.stream()
                .map(fl -> (fl.getLiters() != null && fl.getPricePerLiter() != null)
                        ? fl.getLiters().multiply(fl.getPricePerLiter())
                        : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // All-time average consumption (L/100km) from calculated logs
        // Filter out unrealistic values and require at least 2 entries
        List<BigDecimal> allConsumptions = nonBaseline.stream()
                .filter(fl -> fl.getConsumptionLPer100km() != null)
                .map(FuelLog::getConsumptionLPer100km)
                .filter(c -> c.compareTo(BigDecimal.valueOf(1)) >= 0 && c.compareTo(BigDecimal.valueOf(100)) <= 0)
                .collect(Collectors.toList());

        BigDecimal avgConsumption = null;
        BigDecimal bestConsumption = null;
        BigDecimal worstConsumption = null;
        if (allConsumptions.size() >= 2) {
            avgConsumption = allConsumptions.stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(allConsumptions.size()), 2, RoundingMode.HALF_UP);
            bestConsumption = allConsumptions.stream().min(BigDecimal::compareTo).orElse(null);
            worstConsumption = allConsumptions.stream().max(BigDecimal::compareTo).orElse(null);
        }

        // Recent average: last N full-tank-to-full-tank consumption calculations
        List<BigDecimal> recentConsumptions = nonBaseline.stream()
                .filter(fl -> fl.getConsumptionLPer100km() != null && Boolean.TRUE.equals(fl.getFullTank()))
                .limit(RECENT_FILLS_COUNT)
                .map(FuelLog::getConsumptionLPer100km)
                .collect(Collectors.toList());

        BigDecimal recentAvgConsumption = null;
        if (!recentConsumptions.isEmpty()) {
            recentAvgConsumption = recentConsumptions.stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(recentConsumptions.size()), 2, RoundingMode.HALF_UP);
        }

        // Last fill info
        FuelLog lastFill = allLogs.isEmpty() ? null : allLogs.get(0);

        // Update stats entity
        stats.setTotalFuelLogs(totalLogs);
        stats.setTotalFullTankFills(totalFullTankFills);
        stats.setTotalLiters(totalLiters);
        stats.setTotalDistanceKm(totalDistanceKm);
        stats.setTotalFuelCostZar(totalFuelCost);
        stats.setAverageConsumptionLPer100km(avgConsumption);
        stats.setBestConsumptionLPer100km(bestConsumption);
        stats.setWorstConsumptionLPer100km(worstConsumption);
        stats.setRecentAverageConsumptionLPer100km(recentAvgConsumption);
        if (lastFill != null) {
            stats.setLastFillDate(lastFill.getExpense() != null && lastFill.getExpense().getExpenseDate() != null
                    ? lastFill.getExpense().getExpenseDate()
                    : LocalDate.now());
            stats.setLastFillFullTank(lastFill.getFullTank());
            if (lastFill.getPreviousOdometer() != null && lastFill.getKmSinceLastFill() != null) {
                stats.setLastFillOdometer(lastFill.getPreviousOdometer() + lastFill.getKmSinceLastFill());
            }
        }

        log.info("Recalculated fuel stats for vehicle {}: avg={}L/100km, recentAvg={}L/100km",
                vehicleId, avgConsumption, recentAvgConsumption);

        return statsRepository.save(stats);
    }

    /**
     * Returns a consumption alert if recent average consumption is significantly
     * worse than the all-time average (above DEGRADATION_THRESHOLD_PERCENT).
     */
    @Transactional(readOnly = true)
    public Optional<FuelConsumptionAlertDTO> getConsumptionAlert(UUID vehicleId) {
        return statsRepository.findByVehicleId(vehicleId).flatMap(stats -> {
            BigDecimal avg = stats.getAverageConsumptionLPer100km();
            BigDecimal recent = stats.getRecentAverageConsumptionLPer100km();

            if (avg == null || recent == null || avg.compareTo(BigDecimal.ZERO) == 0) {
                return Optional.empty();
            }

            // Higher L/100km = worse consumption
            // degradationPct = ((recent - avg) / avg) * 100
            BigDecimal degradationPct = recent.subtract(avg)
                    .divide(avg, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);

            if (degradationPct.compareTo(DEGRADATION_THRESHOLD_PERCENT) >= 0) {
                String severity = degradationPct.compareTo(BigDecimal.valueOf(25)) >= 0 ? "HIGH" : "MEDIUM";
                FuelConsumptionAlertDTO alert = FuelConsumptionAlertDTO.builder()
                        .vehicleId(vehicleId)
                        .averageConsumptionLPer100km(avg)
                        .recentAverageConsumptionLPer100km(recent)
                        .degradationPercent(degradationPct)
                        .severity(severity)
                        .message(String.format(
                                "Fuel consumption has worsened by %.1f%% recently (%.1f vs %.1f L/100km average). " +
                                "Consider checking tyre pressure, air filter, or engine condition.",
                                degradationPct.doubleValue(),
                                recent.doubleValue(),
                                avg.doubleValue()))
                        .build();
                return Optional.of(alert);
            }
            return Optional.empty();
        });
    }
}
