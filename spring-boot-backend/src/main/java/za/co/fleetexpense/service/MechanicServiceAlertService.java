package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.ExpiryAlert;
import za.co.fleetexpense.entity.MechanicService;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.ExpiryItemType;
import za.co.fleetexpense.repository.ExpiryAlertRepository;
import za.co.fleetexpense.repository.MechanicServiceRepository;
import za.co.fleetexpense.repository.VehicleRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service to check and create/update mechanic service alerts based on odometer proximity
 * Called immediately after mechanic service creation/update and expense mutations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MechanicServiceAlertService {

    private final MechanicServiceRepository mechanicServiceRepository;
    private final ExpiryAlertRepository expiryAlertRepository;
    private final VehicleRepository vehicleRepository;

    /**
     * Check and update alerts for a specific vehicle
     * Called after expense mutations or mechanic service changes
     */
    @Transactional
    public void checkVehicleAlerts(UUID vehicleId) {
        log.debug("Checking mechanic service alerts for vehicle {}", vehicleId);
        
        Vehicle vehicle = vehicleRepository.findById(vehicleId).orElse(null);
        if (vehicle == null) {
            log.warn("Vehicle {} not found for alert check", vehicleId);
            return;
        }
        
        List<MechanicService> services = mechanicServiceRepository.findByVehicle(vehicleId);
        for (MechanicService service : services) {
            checkServiceAlert(service, vehicle);
        }
    }

    /**
     * Check and update alerts for a specific mechanic service
     * Called after mechanic service creation/update
     */
    @Transactional
    public void checkServiceAlert(MechanicService service, Vehicle vehicle) {
        if (service.getNextServiceDueKm() == null) {
            return; // Skip if no km-based interval set
        }
        
        Integer currentOdometer = vehicle.getCurrentOdometer();
        if (currentOdometer == null) {
            return; // Skip if no current odometer
        }
        
        Integer nextServiceDueKm = service.getNextServiceDueKm();
        int kmRemaining = nextServiceDueKm - currentOdometer;
        
        // Calculate status based on km remaining
        String status;
        if (kmRemaining <= 0) {
            status = "CRITICAL"; // Overdue
        } else if (kmRemaining <= 2000) {
            status = "WARNING"; // Due soon
        } else if (kmRemaining <= 5000) {
            status = "UPCOMING"; // Coming up
        } else {
            status = "FUTURE"; // Not due yet
        }
        
        // Only create/update alert if status is CRITICAL, WARNING, or UPCOMING
        if (!"FUTURE".equals(status)) {
            // Dismiss all old mechanic service alerts for this vehicle (user took corrective action)
            List<ExpiryAlert> oldVehicleAlerts = expiryAlertRepository.findByVehicleId(vehicle.getId());
            for (ExpiryAlert oldAlert : oldVehicleAlerts) {
                if (ExpiryItemType.MECHANIC_SERVICE.name().equals(oldAlert.getItemType()) 
                        && !oldAlert.getIsDismissed()
                        && !service.getExpense().getId().equals(oldAlert.getItemId())) {
                    oldAlert.setIsDismissed(true);
                    oldAlert.setUpdatedAt(java.time.OffsetDateTime.now());
                    expiryAlertRepository.save(oldAlert);
                    log.info("Dismissed old mechanic service alert {} for vehicle {} (new service added)", 
                            oldAlert.getId(), vehicle.getRegistrationNumber());
                }
            }

            List<ExpiryAlert> existingAlerts = expiryAlertRepository.findByItemTypeAndItemId(
                    ExpiryItemType.MECHANIC_SERVICE.name(), service.getExpense().getId());
            
            if (existingAlerts.isEmpty()) {
                // Create new alert
                createMechanicServiceAlert(service, vehicle, currentOdometer, nextServiceDueKm, kmRemaining, status);
            } else {
                // Update existing alert
                ExpiryAlert alert = existingAlerts.get(0);
                updateMechanicServiceAlert(alert, vehicle, currentOdometer, nextServiceDueKm, kmRemaining, status);
            }
        } else {
            // Dismiss existing alerts if status is FUTURE (service not due yet)
            List<ExpiryAlert> existingAlerts = expiryAlertRepository.findByItemTypeAndItemId(
                    ExpiryItemType.MECHANIC_SERVICE.name(), service.getExpense().getId());
            
            for (ExpiryAlert alert : existingAlerts) {
                if (!alert.getIsDismissed()) {
                    alert.setIsDismissed(true);
                    alert.setUpdatedAt(java.time.OffsetDateTime.now());
                    expiryAlertRepository.save(alert);
                }
            }
        }
    }
    
    private void createMechanicServiceAlert(MechanicService service, Vehicle vehicle, 
                                          Integer currentOdometer, Integer nextServiceDueKm, 
                                          int kmRemaining, String status) {
        UUID alertId = UUID.randomUUID();
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        
        // Calculate expiry date based on km remaining (rough estimate: 1000 km per month)
        int monthsUntil = Math.max(1, Math.abs(kmRemaining) / 1000);
        LocalDate expiryDate = kmRemaining <= 0 
                ? LocalDate.now().minusDays(1) 
                : LocalDate.now().plusMonths(monthsUntil);
        
        int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
        
        String serviceTypeName = service.getServiceType().name();
        String itemName = serviceTypeName + " due";
        String itemDescription = String.format("Due at %d km. Current: %d km (%d km remaining)", 
                nextServiceDueKm, currentOdometer, kmRemaining);
        
        expiryAlertRepository.createAlertNative(
                alertId,
                vehicle.getOrganization().getId(),
                ExpiryItemType.MECHANIC_SERVICE.name(),
                service.getExpense().getId(),
                null,
                itemName,
                itemDescription,
                vehicle.getId(),
                null,
                expiryDate,
                daysUntil,
                status,
                now,
                now
        );
        
        log.info("Created mechanic service alert {} for service {} ({})", alertId, service.getId(), serviceTypeName);
    }
    
    private void updateMechanicServiceAlert(ExpiryAlert alert, Vehicle vehicle,
                                         Integer currentOdometer, Integer nextServiceDueKm, 
                                         int kmRemaining, String status) {
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now();
        
        // Recalculate expiry date
        int monthsUntil = Math.max(1, Math.abs(kmRemaining) / 1000);
        LocalDate expiryDate = kmRemaining <= 0 
                ? LocalDate.now().minusDays(1) 
                : LocalDate.now().plusMonths(monthsUntil);
        
        int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
        
        String itemDescription = String.format("Due at %d km. Current: %d km (%d km remaining)", 
                nextServiceDueKm, currentOdometer, kmRemaining);
        
        alert.setExpiryDate(expiryDate);
        alert.setDaysUntilExpiry(daysUntil);
        alert.setExpiryStatus(status);
        alert.setItemDescription(itemDescription);
        alert.setUpdatedAt(now);
        
        expiryAlertRepository.save(alert);
        
        log.info("Updated mechanic service alert {} for service {}", alert.getId(), alert.getItemId());
    }
}
