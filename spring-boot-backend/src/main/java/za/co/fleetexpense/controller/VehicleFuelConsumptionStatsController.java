package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.FuelConsumptionAlertDTO;
import za.co.fleetexpense.dto.VehicleFuelConsumptionStatsDTO;
import za.co.fleetexpense.service.VehicleFuelConsumptionStatsService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicles/{vehicleId}/fuel-stats")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class VehicleFuelConsumptionStatsController {

    private final VehicleFuelConsumptionStatsService statsService;

    @GetMapping
    public ResponseEntity<VehicleFuelConsumptionStatsDTO> getFuelStats(@PathVariable UUID vehicleId) {
        return statsService.getStatsByVehicleId(vehicleId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(
                        VehicleFuelConsumptionStatsDTO.builder()
                                .vehicleId(vehicleId)
                                .totalFuelLogs(0)
                                .totalFullTankFills(0)
                                .totalLiters(java.math.BigDecimal.ZERO)
                                .totalDistanceKm(0)
                                .totalFuelCostZar(java.math.BigDecimal.ZERO)
                                .averageConsumptionLPer100km(null)
                                .recentAverageConsumptionLPer100km(null)
                                .bestConsumptionLPer100km(null)
                                .worstConsumptionLPer100km(null)
                                .build()
                ));
    }

    @PostMapping("/recalculate")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Void> recalculateStats(@PathVariable UUID vehicleId) {
        statsService.recalculateStats(vehicleId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/consumption-alert")
    public ResponseEntity<FuelConsumptionAlertDTO> getConsumptionAlert(@PathVariable UUID vehicleId) {
        return statsService.getConsumptionAlert(vehicleId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
