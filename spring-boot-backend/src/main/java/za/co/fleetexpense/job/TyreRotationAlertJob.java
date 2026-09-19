package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.ExpiryAlert;
import za.co.fleetexpense.entity.TyreRotationTracking;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.ExpiryItemType;
import za.co.fleetexpense.repository.ExpiryAlertRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.TyreRotationTrackingRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Scheduled job to create and update tyre rotation alerts based on odometer readings
 * Runs every hour to check if tyre rotation alerts need to be created or updated
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TyreRotationAlertJob {

    private final TyreRotationTrackingRepository trackingRepository;
    private final ExpiryAlertRepository expiryAlertRepository;
    private final OrganizationRepository organizationRepository;

    /**
     * Check all active tyre rotation tracking and create/update expiry alerts
     * Runs every hour
     */
    @Scheduled(cron = "0 0 * * * ?") // Every hour
    @Transactional
    public void checkTyreRotationAlerts() {
        log.info("Checking tyre rotation alerts...");
        
        int createdCount = 0;
        int updatedCount = 0;
        
        // Get all organizations and check each one
        List<UUID> organizationIds = organizationRepository.findAll().stream()
                .map(org -> org.getId())
                .toList();
        
        for (UUID orgId : organizationIds) {
            List<TyreRotationTracking> activeTracking = trackingRepository.findAllActive(orgId);
        
            for (TyreRotationTracking tracking : activeTracking) {
                if (tracking.getVehicle() == null || tracking.getNextRotationOdometer() == null) {
                    continue;
                }
                
                Vehicle vehicle = tracking.getVehicle();
                Integer currentOdometer = vehicle.getCurrentOdometer() != null 
                        ? vehicle.getCurrentOdometer() 
                        : tracking.getInstallationOdometer();
                
                if (currentOdometer == null) {
                    continue;
                }
                
                Integer nextRotationOdometer = tracking.getNextRotationOdometer();
                int distanceUntilThreshold = nextRotationOdometer - currentOdometer;
                
                // Calculate status based on distance until threshold
                String status;
                if (distanceUntilThreshold <= 0) {
                    status = "CRITICAL";
                } else if (distanceUntilThreshold <= 1000) {
                    status = "WARNING";
                } else if (distanceUntilThreshold <= 2000) {
                    status = "UPCOMING";
                } else {
                    status = "VALID";
                }
                
                // Only create/update alert if status is not VALID
                if (!"VALID".equals(status)) {
                    List<ExpiryAlert> existingAlerts = expiryAlertRepository.findByItemTypeAndItemId(
                            ExpiryItemType.TYRE_ROTATION.name(), tracking.getId());
                    
                    if (existingAlerts.isEmpty()) {
                        // Create new alert
                        createTyreRotationAlert(tracking, currentOdometer, nextRotationOdometer, distanceUntilThreshold, status);
                        createdCount++;
                    } else {
                        // Update existing alert
                        ExpiryAlert alert = existingAlerts.get(0);
                        updateTyreRotationAlert(alert, currentOdometer, nextRotationOdometer, distanceUntilThreshold, status);
                        updatedCount++;
                    }
                }
            }
        }
        
        log.info("Tyre rotation alert check completed: {} created, {} updated", createdCount, updatedCount);
    }
    
    private void createTyreRotationAlert(TyreRotationTracking tracking, Integer currentOdometer, 
                                          Integer nextRotationOdometer, int distanceUntilThreshold, String status) {
        UUID alertId = UUID.randomUUID();
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        
        // Calculate expiry date based on distance (rough estimate: 1000 km per month)
        int monthsUntil = Math.max(1, Math.abs(distanceUntilThreshold) / 1000);
        LocalDate expiryDate = distanceUntilThreshold <= 0 
                ? LocalDate.now().minusDays(1) 
                : LocalDate.now().plusMonths(monthsUntil);
        
        int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
        
        expiryAlertRepository.createAlertNative(
                alertId,
                tracking.getOrganization().getId(),
                ExpiryItemType.TYRE_ROTATION.name(),
                tracking.getId(),
                null,
                "Tyre Rotation",
                "Rotation needed at " + nextRotationOdometer + " km",
                tracking.getVehicle().getId(),
                null,
                expiryDate,
                daysUntil,
                status,
                now,
                now
        );
        
        // Update odometer fields
        expiryAlertRepository.updateOdometerFields(
                alertId,
                currentOdometer,
                nextRotationOdometer,
                distanceUntilThreshold
        );
        
        log.info("Created tyre rotation alert {} for tracking {}", alertId, tracking.getId());
    }
    
    private void updateTyreRotationAlert(ExpiryAlert alert, Integer currentOdometer,
                                         Integer nextRotationOdometer, int distanceUntilThreshold, String status) {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        
        // Recalculate expiry date
        int monthsUntil = Math.max(1, Math.abs(distanceUntilThreshold) / 1000);
        LocalDate expiryDate = distanceUntilThreshold <= 0 
                ? LocalDate.now().minusDays(1) 
                : LocalDate.now().plusMonths(monthsUntil);
        
        int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
        
        alert.setExpiryDate(expiryDate);
        alert.setDaysUntilExpiry(daysUntil);
        alert.setExpiryStatus(status);
        alert.setUpdatedAt(now);
        
        // Update odometer fields
        expiryAlertRepository.updateOdometerFields(
                alert.getId(),
                currentOdometer,
                nextRotationOdometer,
                distanceUntilThreshold
        );
        
        expiryAlertRepository.save(alert);
        
        log.info("Updated tyre rotation alert {} for tracking {}", alert.getId(), alert.getItemId());
    }
}
