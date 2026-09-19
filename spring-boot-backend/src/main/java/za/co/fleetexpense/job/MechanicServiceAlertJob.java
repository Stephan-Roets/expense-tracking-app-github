package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.service.MechanicServiceAlertService;

import java.util.List;
import java.util.UUID;

/**
 * Scheduled job to create and update mechanic service due alerts based on odometer proximity
 * Runs every hour to check if mechanic service alerts need to be created or updated
 * This is a backup to the immediate checks done on expense mutations
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MechanicServiceAlertJob {

    private final MechanicServiceAlertService mechanicServiceAlertService;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;

    /**
     * Check all mechanic services and create/update expiry alerts based on odometer proximity
     * Runs every hour as a backup to immediate checks
     */
    @Scheduled(cron = "0 0 * * * ?") // Every hour
    @Transactional
    public void checkMechanicServiceAlerts() {
        log.info("Checking mechanic service alerts (scheduled job)...");
        
        // Get all organizations and check each one
        List<UUID> organizationIds = organizationRepository.findAll().stream()
                .map(org -> org.getId())
                .toList();
        
        for (UUID orgId : organizationIds) {
            // Get all vehicles in organization
            List<Vehicle> vehicles = vehicleRepository.findByOrganizationId(orgId);
            
            for (Vehicle vehicle : vehicles) {
                try {
                    mechanicServiceAlertService.checkVehicleAlerts(vehicle.getId());
                } catch (Exception e) {
                    log.warn("Failed to check alerts for vehicle {}: {}", vehicle.getId(), e.getMessage());
                }
            }
        }
        
        log.info("Mechanic service alert check completed");
    }
}
