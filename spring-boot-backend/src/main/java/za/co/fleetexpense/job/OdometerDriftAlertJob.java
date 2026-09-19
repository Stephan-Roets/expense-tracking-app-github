package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.OdometerDriftAlert;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.service.OdometerDriftAlertService;

import java.util.List;
import java.util.UUID;

/**
 * Scheduled job to check all vehicles for odometer drift
 * Runs daily at 3:00 AM to detect when stored odometer < computed odometer
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OdometerDriftAlertJob {

    private final VehicleRepository vehicleRepository;
    private final OdometerDriftAlertService odometerDriftAlertService;

    /**
     * Check all vehicles for odometer drift
     * Runs every day at 3:00 AM
     */
    @Scheduled(cron = "0 0 3 * * ?") // 3:00 AM daily
    @Transactional
    public void checkAllVehiclesForDrift() {
        log.info("Starting odometer drift check for all vehicles...");
        
        List<UUID> allVehicleIds = vehicleRepository.findAllIds();
        int alertsCreated = 0;
        int alertsDismissed = 0;
        
        for (UUID vehicleId : allVehicleIds) {
            try {
                OdometerDriftAlert alert = odometerDriftAlertService.checkAndCreateAlert(vehicleId);
                if (alert != null) {
                    alertsCreated++;
                } else {
                    alertsDismissed++;
                }
            } catch (Exception e) {
                log.error("Error checking vehicle {} for odometer drift", vehicleId, e);
            }
        }
        
        log.info("Odometer drift check completed. Vehicles checked: {}, Alerts created: {}, Auto-dismissed: {}", 
                allVehicleIds.size(), alertsCreated, alertsDismissed);
    }
}
