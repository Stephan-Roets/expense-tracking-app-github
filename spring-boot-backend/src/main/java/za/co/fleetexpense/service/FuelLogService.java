package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.FuelLogCreateRequest;
import za.co.fleetexpense.dto.FuelLogDTO;
import za.co.fleetexpense.dto.FuelLogUpdateRequest;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.FuelLog;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.FuelLogMapper;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.FuelLogRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuelLogService {

    private final FuelLogRepository fuelLogRepository;
    private final ExpenseRepository expenseRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final FuelLogMapper fuelLogMapper;

    @Lazy
    @Autowired
    private VehicleFuelConsumptionStatsService consumptionStatsService;

    // ==================== DTO-BASED CRUD OPERATIONS ====================

    public FuelLogDTO getById(UUID id) {
        FuelLog fuelLog = fuelLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fuel log not found: " + id));
        return fuelLogMapper.toDTO(fuelLog);
    }

    public FuelLogDTO getByExpenseId(UUID expenseId) {
        FuelLog fuelLog = fuelLogRepository.findByExpenseId(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Fuel log not found for expense: " + expenseId));
        return fuelLogMapper.toDTO(fuelLog);
    }

    @Transactional(readOnly = true)
    public List<FuelLogDTO> getByVehicle(UUID vehicleId, UUID userId, UserRole role) {
        if (role == UserRole.DRIVER) {
            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found");
            }
        }
        List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);
        return fuelLogs.stream()
                .map(fuelLogMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FuelLogDTO> getByOrganization(UUID organizationId, UUID userId, UserRole role) {
        List<FuelLog> fuelLogs;
        if (role == UserRole.DRIVER) {
            fuelLogs = fuelLogRepository.findByOrganizationAndUserId(organizationId, userId);
        } else {
            fuelLogs = fuelLogRepository.findByOrganization(organizationId);
        }
        return fuelLogs.stream()
                .map(fuelLogMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public FuelLogDTO create(FuelLogCreateRequest request, UUID userId) {
        // Validate expense exists
        Expense expense = expenseRepository.findById(request.getExpenseId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        // Validate vehicle
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Verify expense belongs to vehicle
        if (!expense.getVehicle().getId().equals(vehicle.getId())) {
            throw new ValidationException("Expense does not belong to the specified vehicle");
        }

        // Validate odometer reading is not lower than computed vehicle odometer (display value)
        // This preserves the original currentOdometer for fuel consumption calculations
        if (request.getOdometerReading() != null) {
            Integer displayOdometer = vehicle.getComputedOdometer() != null ? vehicle.getComputedOdometer() : vehicle.getCurrentOdometer();
            Integer storedOdometer = vehicle.getCurrentOdometerStored();
            
            if (displayOdometer != null && request.getOdometerReading() < displayOdometer) {
                String message = "Odometer reading too low. ";
                
                if (storedOdometer != null && !storedOdometer.equals(displayOdometer)) {
                    message += "The vehicle's stored baseline is " + storedOdometer + " km, ";
                    message += "but the last recorded fuel expense shows " + displayOdometer + " km. ";
                    message += "You entered " + request.getOdometerReading() + " km. ";
                    message += "Please enter an odometer reading higher than " + displayOdometer + " km.";
                } else {
                    message += "Current vehicle odometer is " + displayOdometer + " km, ";
                    message += "but you entered " + request.getOdometerReading() + " km. ";
                    message += "Please enter an odometer reading higher than " + displayOdometer + " km.";
                }
                
                throw new ValidationException(message);
            }
        }

        // Map request to entity
        FuelLog fuelLog = fuelLogMapper.toEntity(request);
        fuelLog.setExpense(expense);

        // Get previous odometer from the most recent fuel log for this vehicle
        List<FuelLog> vehicleFuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicle.getId());
        Integer previousOdometer = null;
        if (!vehicleFuelLogs.isEmpty()) {
            // Get the odometer reading from the most recent fuel log's expense
            FuelLog lastFuelLog = vehicleFuelLogs.get(0);
            if (lastFuelLog.getExpense() != null && lastFuelLog.getExpense().getOdometerReading() != null) {
                previousOdometer = lastFuelLog.getExpense().getOdometerReading();
            }
        }
        // Fall back to vehicle's current odometer (stored baseline) if no fuel logs exist
        if (previousOdometer == null) {
            previousOdometer = vehicle.getCurrentOdometerStored();
        }
        fuelLog.setPreviousOdometer(previousOdometer);

        // Keep parent expense's odometerReading in sync so that summary views
        // and forms that read ExpenseDTO.odometerReading see the last value
        if (request.getOdometerReading() != null) {
            expense.setOdometerReading(request.getOdometerReading());
            
            // Update the vehicle's computedOdometer (transient display field) to reflect the latest reading
            // This preserves the original currentOdometer for fuel consumption calculations
            vehicle.setComputedOdometer(request.getOdometerReading());
            log.info("Updated vehicle {} computed odometer to {} during fuel log creation", vehicle.getId(), request.getOdometerReading());
        }

        // Calculate km since last fill if not baseline
        if (Boolean.TRUE.equals(request.getIsBaselineFill())) {
            fuelLog.setIsBaselineFill(true);
            fuelLog.setKmSinceLastFill(0);
        } else {
            fuelLog.setIsBaselineFill(false);
            if (request.getOdometerReading() != null && previousOdometer != null) {
                fuelLog.setKmSinceLastFill(request.getOdometerReading() - previousOdometer);
            }
        }

        FuelLog saved = fuelLogRepository.save(fuelLog);
        log.info("Created fuel log {} for expense {}", saved.getId(), expense.getId());

        // Auto-calculate consumption if not baseline
        if (!Boolean.TRUE.equals(saved.getIsBaselineFill())) {
            try {
                calculateConsumption(saved.getId());
            } catch (Exception e) {
                log.warn("Failed to auto-calculate consumption for fuel log {}: {}", saved.getId(), e.getMessage());
            }
        }

        return fuelLogMapper.toDTO(saved);
    }

    @Transactional
    public FuelLogDTO update(UUID id, FuelLogUpdateRequest request) {
        FuelLog existing = fuelLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fuel log not found: " + id));

        // Validate odometer reading is not lower than computed vehicle odometer (display value)
        // This preserves the original currentOdometer for fuel consumption calculations
        if (request.getOdometerReading() != null) {
            Expense expense = existing.getExpense();
            if (expense != null && expense.getVehicle() != null) {
                Vehicle vehicle = expense.getVehicle();
                Integer displayOdometer = vehicle.getComputedOdometer() != null ? vehicle.getComputedOdometer() : vehicle.getCurrentOdometer();
                Integer storedOdometer = vehicle.getCurrentOdometerStored();
                
                if (displayOdometer != null && request.getOdometerReading() < displayOdometer) {
                    String message = "Odometer reading too low. ";
                    
                    if (storedOdometer != null && !storedOdometer.equals(displayOdometer)) {
                        message += "The vehicle's stored baseline is " + storedOdometer + " km, ";
                        message += "but the last recorded fuel expense shows " + displayOdometer + " km. ";
                        message += "You entered " + request.getOdometerReading() + " km. ";
                        message += "Please enter an odometer reading higher than " + displayOdometer + " km.";
                    } else {
                        message += "Current vehicle odometer is " + displayOdometer + " km, ";
                        message += "but you entered " + request.getOdometerReading() + " km. ";
                        message += "Please enter an odometer reading higher than " + displayOdometer + " km.";
                    }
                    
                    throw new ValidationException(message);
                }
            }
        }

        // Apply updates using mapper
        fuelLogMapper.updateEntity(existing, request);

        // Recalculate odometer fields if provided
        if (request.getOdometerReading() != null) {
            if (existing.getPreviousOdometer() != null) {
                existing.setKmSinceLastFill(request.getOdometerReading() - existing.getPreviousOdometer());
            } else {
                // If this is the first fill, set previousOdometer to the new reading
                existing.setPreviousOdometer(request.getOdometerReading());
                existing.setKmSinceLastFill(0);
            }

            // Also keep the parent expense's odometerReading in sync so that
            // subsequent ExpenseDTOs and exports reflect the updated value
            Expense expense = existing.getExpense();
            if (expense != null) {
                expense.setOdometerReading(request.getOdometerReading());

                // Update the vehicle's computedOdometer (transient display field) to reflect the latest reading
                // This preserves the original currentOdometer for fuel consumption calculations
                Vehicle vehicle = expense.getVehicle();
                if (vehicle != null) {
                    vehicle.setComputedOdometer(request.getOdometerReading());
                    log.info("Updated vehicle {} computed odometer to {}", vehicle.getId(), request.getOdometerReading());
                }
            }
        }

        FuelLog saved = fuelLogRepository.save(existing);
        log.info("Updated fuel log {}", id);
        return fuelLogMapper.toDTO(saved);
    }

    @Transactional
    public void delete(UUID id) {
        FuelLog fuelLog = fuelLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fuel log not found: " + id));
        fuelLogRepository.delete(fuelLog);
        log.info("Deleted fuel log {}", id);
    }

    // ==================== CONSUMPTION CALCULATION ====================

    @Transactional
    public FuelLogDTO calculateConsumption(UUID id) {
        FuelLog fuelLog = fuelLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fuel log not found: " + id));

        if (Boolean.TRUE.equals(fuelLog.getIsBaselineFill())) {
            log.info("Skipping consumption calculation for baseline fill {}", id);
            return fuelLogMapper.toDTO(fuelLog);
        }

        if (fuelLog.getKmSinceLastFill() != null && fuelLog.getKmSinceLastFill() > 0
                && fuelLog.getLiters() != null && fuelLog.getLiters().compareTo(BigDecimal.ZERO) > 0) {
            // Calculate efficiency: km/L
            BigDecimal efficiency = BigDecimal.valueOf(fuelLog.getKmSinceLastFill())
                    .divide(fuelLog.getLiters(), 2, RoundingMode.HALF_UP);
            fuelLog.setEfficiencyKmPerLiter(efficiency);

            // Calculate consumption: L/100km
            BigDecimal consumption = BigDecimal.valueOf(100)
                    .divide(efficiency, 2, RoundingMode.HALF_UP);
            fuelLog.setConsumptionLPer100km(consumption);

            fuelLog.setConsumptionCalculatedAt(OffsetDateTime.now());

            // Update vehicle computed odometer (transient display field)
            // This preserves the original currentOdometer for fuel consumption calculations
            Vehicle vehicle = fuelLog.getExpense().getVehicle();
            if (vehicle != null && fuelLog.getPreviousOdometer() != null && fuelLog.getKmSinceLastFill() != null) {
                int currentOdometer = fuelLog.getPreviousOdometer() + fuelLog.getKmSinceLastFill();
                vehicle.setComputedOdometer(currentOdometer);
            }

            log.info("Calculated consumption for fuel log {}: {} km/L, {} L/100km",
                    id, efficiency, consumption);
        }

        FuelLog saved = fuelLogRepository.save(fuelLog);

        // Auto-recalculate aggregate stats so alert detection stays current
        try {
            Vehicle vehicle = fuelLog.getExpense().getVehicle();
            if (vehicle != null) {
                consumptionStatsService.recalculateStats(vehicle.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to recalculate consumption stats after calculateConsumption: {}", e.getMessage());
        }

        return fuelLogMapper.toDTO(saved);
    }

    // ==================== ANALYTICS METHODS ====================

    /**
     * Get fuel statistics for a vehicle
     */
    public Map<String, BigDecimal> getVehicleFuelStatistics(UUID vehicleId) {
        Map<String, BigDecimal> stats = new HashMap<>();

        List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);

        if (fuelLogs.isEmpty()) {
            stats.put("totalLiters", BigDecimal.ZERO);
            stats.put("totalCost", BigDecimal.ZERO);
            stats.put("averagePricePerLiter", BigDecimal.ZERO);
            stats.put("averageConsumption", BigDecimal.ZERO);
            return stats;
        }

        // Calculate totals
        BigDecimal totalLiters = fuelLogs.stream()
                .map(fl -> fl.getLiters() != null ? fl.getLiters() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = fuelLogs.stream()
                .map(fl -> {
                    if (fl.getLiters() != null && fl.getPricePerLiter() != null) {
                        return fl.getLiters().multiply(fl.getPricePerLiter());
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate average price per liter
        BigDecimal avgPricePerLiter = fuelLogs.stream()
                .filter(fl -> fl.getPricePerLiter() != null)
                .map(FuelLog::getPricePerLiter)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(fuelLogs.size()), 2, RoundingMode.HALF_UP);

        // Calculate average consumption
        List<BigDecimal> consumptions = fuelLogs.stream()
                .filter(fl -> fl.getConsumptionLPer100km() != null)
                .map(FuelLog::getConsumptionLPer100km)
                .collect(Collectors.toList());

        if (!consumptions.isEmpty()) {
            BigDecimal avgConsumption = consumptions.stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(consumptions.size()), 2, RoundingMode.HALF_UP);
            stats.put("averageConsumption", avgConsumption);
        } else {
            stats.put("averageConsumption", BigDecimal.ZERO);
        }

        stats.put("totalLiters", totalLiters);
        stats.put("totalCost", totalCost);
        stats.put("averagePricePerLiter", avgPricePerLiter);
        stats.put("fuelLogCount", BigDecimal.valueOf(fuelLogs.size()));

        return stats;
    }

    /**
     * Get average fuel consumption for a vehicle
     * Calculates overall consumption as total distance / total fuel instead of averaging individual values
     */
    public BigDecimal getAverageConsumptionForVehicle(UUID vehicleId) {
        List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);

        // Filter out baseline fills and logs without required data
        List<FuelLog> validFuelLogs = fuelLogs.stream()
                .filter(fl -> !Boolean.TRUE.equals(fl.getIsBaselineFill()))
                .filter(fl -> fl.getKmSinceLastFill() != null && fl.getKmSinceLastFill() > 0)
                .filter(fl -> fl.getLiters() != null && fl.getLiters().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());

        if (validFuelLogs.isEmpty()) {
            return BigDecimal.ZERO;
        }

        // Calculate total distance and total fuel
        int totalDistance = validFuelLogs.stream()
                .mapToInt(FuelLog::getKmSinceLastFill)
                .sum();

        BigDecimal totalFuel = validFuelLogs.stream()
                .map(fl -> fl.getLiters() != null ? fl.getLiters() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalDistance == 0 || totalFuel.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        // Calculate overall consumption: (total fuel / total distance) * 100
        BigDecimal consumption = totalFuel
                .divide(BigDecimal.valueOf(totalDistance), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);

        return consumption;
    }

    /**
     * Get best (lowest) fuel consumption for a vehicle
     */
    public BigDecimal getBestConsumptionForVehicle(UUID vehicleId) {
        List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);

        return fuelLogs.stream()
                .filter(fl -> fl.getConsumptionLPer100km() != null && !Boolean.TRUE.equals(fl.getIsBaselineFill()))
                .map(FuelLog::getConsumptionLPer100km)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Get worst (highest) fuel consumption for a vehicle
     */
    public BigDecimal getWorstConsumptionForVehicle(UUID vehicleId) {
        List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);

        return fuelLogs.stream()
                .filter(fl -> fl.getConsumptionLPer100km() != null && !Boolean.TRUE.equals(fl.getIsBaselineFill()))
                .map(FuelLog::getConsumptionLPer100km)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }
}
