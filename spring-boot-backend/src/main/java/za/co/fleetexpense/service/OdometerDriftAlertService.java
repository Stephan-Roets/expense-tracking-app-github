package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.OdometerDriftAlert;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OdometerDriftAlertService {

    private final OdometerDriftAlertRepository odometerDriftAlertRepository;
    private final VehicleRepository vehicleRepository;
    private final ExpenseRepository expenseRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    @Value("${odometer.auto-recalculate:false}")
    private boolean autoRecalculate;

    public List<OdometerDriftAlert> getByOrganization(UUID organizationId) {
        return odometerDriftAlertRepository.findByOrganizationId(organizationId);
    }

    public List<OdometerDriftAlert> getActiveAlerts(UUID organizationId) {
        return odometerDriftAlertRepository.findByOrganizationIdAndIsDismissedFalse(organizationId);
    }

    public int checkAllVehiclesInOrganization(UUID organizationId) {
        List<za.co.fleetexpense.entity.Vehicle> vehicles = vehicleRepository.findByOrganizationIdAndIsActiveTrue(organizationId);
        int alertsCreated = 0;

        for (za.co.fleetexpense.entity.Vehicle vehicle : vehicles) {
            try {
                OdometerDriftAlert alert = checkAndCreateAlert(vehicle.getId());
                if (alert != null) {
                    alertsCreated++;
                }
            } catch (Exception e) {
                log.error("Error checking vehicle {} for odometer drift", vehicle.getId(), e);
            }
        }

        log.info("Checked {} vehicles for odometer drift, created {} alerts", vehicles.size(), alertsCreated);
        return alertsCreated;
    }

    public OdometerDriftAlert getByVehicle(UUID vehicleId) {
        return odometerDriftAlertRepository.findByVehicleId(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Odometer drift alert not found for vehicle: " + vehicleId));
    }

    @Transactional
    public OdometerDriftAlert checkAndCreateAlert(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found: " + vehicleId));

        Integer storedOdometer = vehicle.getCurrentOdometerStored();
        Integer globalMax = expenseRepository.findMaxOdometerByVehicleId(vehicleId).orElse(storedOdometer);
        
        // Get individual expense type MAX values for enhanced drift detection
        Integer fuelMax = expenseRepository.findMaxFuelOdometerByVehicleId(vehicleId).orElse(0);
        Integer mechanicMax = expenseRepository.findMaxMechanicOdometerByVehicleId(vehicleId).orElse(0);
        Integer tyreMax = expenseRepository.findMaxTyreOdometerByVehicleId(vehicleId).orElse(0);

        // Drift Type 1: Stored baseline is wrong (stored != global MAX)
        int baselineThreshold = 100;
        boolean baselineDrift = storedOdometer != null && globalMax != null && 
                Math.abs(storedOdometer - globalMax) >= baselineThreshold;

        // Drift Type 2: Fuel chain is behind other expenses (fuel MAX < global MAX by >1,000 km)
        // This catches the "deleted fuel but tyre keeps computed high" case
        int fuelChainThreshold = 1000;
        boolean fuelChainDrift = fuelMax > 0 && globalMax > fuelMax + fuelChainThreshold;

        // Drift Type 3: Mechanic service logged ahead of fuel (suspicious)
        int mechanicAheadThreshold = 2000;
        boolean mechanicAheadDrift = mechanicMax > fuelMax + mechanicAheadThreshold;

        // Create alert if any drift condition is met
        if (baselineDrift || fuelChainDrift || mechanicAheadDrift) {
            // Auto-recalculate if enabled AND stored < computed (expenses deleted/edited)
            // If stored > computed, vehicle was driven since last expense - do NOT recalculate
            if (autoRecalculate && storedOdometer != null && globalMax != null && storedOdometer < globalMax) {
                try {
                    vehicle.setCurrentOdometerStored(globalMax);
                    vehicleRepository.save(vehicle);
                    log.info("Auto-recalculated odometer for vehicle {} - updated from {} to {} km",
                            vehicleId, storedOdometer, globalMax);

                    // Dismiss any existing alert since we fixed it
                    odometerDriftAlertRepository.findByVehicleIdAndIsDismissedFalse(vehicleId)
                            .ifPresent(alert -> {
                                alert.setIsDismissed(true);
                                alert.setDismissedAt(OffsetDateTime.now());
                                odometerDriftAlertRepository.save(alert);
                                log.info("Auto-dismissed odometer drift alert for vehicle {} after auto-recalculate", vehicleId);
                            });
                    return null;
                } catch (Exception e) {
                    log.error("Auto-recalculate failed for vehicle {}, falling back to manual alert", vehicleId, e);
                    // Fall through to manual alert creation
                }
            }
            
            // Manual fallback: create alert with detailed drift info
            return odometerDriftAlertRepository.findByVehicleIdAndIsDismissedFalse(vehicleId)
                    .map(existingAlert -> {
                        // Update existing alert if values changed
                        if (!existingAlert.getStoredOdometer().equals(storedOdometer) ||
                            !existingAlert.getComputedOdometer().equals(globalMax)) {
                            existingAlert.setStoredOdometer(storedOdometer);
                            existingAlert.setComputedOdometer(globalMax);
                            log.info("Updated odometer drift alert for vehicle {} - stored: {}, computed: {}, fuelMax: {}, mechanicMax: {}, tyreMax: {}",
                                    vehicleId, storedOdometer, globalMax, fuelMax, mechanicMax, tyreMax);
                            return odometerDriftAlertRepository.save(existingAlert);
                        }
                        return existingAlert;
                    })
                    .orElseGet(() -> {
                        // Create new alert
                        OdometerDriftAlert alert = OdometerDriftAlert.builder()
                                .organization(vehicle.getOrganization())
                                .vehicle(vehicle)
                                .vehicleRegistration(vehicle.getRegistrationNumber())
                                .storedOdometer(storedOdometer)
                                .computedOdometer(globalMax)
                                .isDismissed(false)
                                .build();
                        OdometerDriftAlert saved = odometerDriftAlertRepository.save(alert);
                        
                        String driftReason = baselineDrift ? "baseline drift" : 
                                          fuelChainDrift ? "fuel chain lag" : "mechanic ahead of fuel";
                        log.info("Created odometer drift alert for vehicle {} - reason: {}, stored: {}, computed: {}, fuelMax: {}, mechanicMax: {}, tyreMax: {}",
                                vehicleId, driftReason, storedOdometer, globalMax, fuelMax, mechanicMax, tyreMax);
                        return saved;
                    });
        } else {
            // Difference below threshold - dismiss any existing alert
            odometerDriftAlertRepository.findByVehicleIdAndIsDismissedFalse(vehicleId)
                    .ifPresent(alert -> {
                        alert.setIsDismissed(true);
                        alert.setDismissedAt(OffsetDateTime.now());
                        odometerDriftAlertRepository.save(alert);
                        log.info("Auto-dismissed odometer drift alert for vehicle {} - difference below threshold", vehicleId);
                    });
            return null;
        }
    }

    @Transactional
    public OdometerDriftAlert dismissAlert(UUID vehicleId, UUID userId) {
        OdometerDriftAlert alert = getByVehicle(vehicleId);
        alert.setIsDismissed(true);
        alert.setDismissedAt(OffsetDateTime.now());
        alert.setDismissedByUser(userRepository.findById(userId).orElse(null));
        OdometerDriftAlert saved = odometerDriftAlertRepository.save(alert);
        log.info("Dismissed odometer drift alert for vehicle {}", vehicleId);
        return saved;
    }

    @Transactional
    public void deleteAlert(UUID vehicleId) {
        odometerDriftAlertRepository.deleteByVehicleId(vehicleId);
        log.info("Deleted odometer drift alert for vehicle {}", vehicleId);
    }

    public String getAlertMessage(OdometerDriftAlert alert) {
        return String.format("Vehicle %s odometer needs recalculating - stored: %d km, computed: %d km",
                alert.getVehicleRegistration(), alert.getStoredOdometer(), alert.getComputedOdometer());
    }
}
