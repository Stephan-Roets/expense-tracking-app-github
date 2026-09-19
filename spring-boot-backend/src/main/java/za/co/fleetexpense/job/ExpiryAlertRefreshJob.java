package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.ExpiryAlert;
import za.co.fleetexpense.repository.ExpiryAlertRepository;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduled job to refresh expiry alert statuses
 * Runs daily at 2:00 AM to update EXPIRED, CRITICAL, WARNING, UPCOMING statuses
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExpiryAlertRefreshJob {

    private final ExpiryAlertRepository expiryAlertRepository;

    /**
     * Refresh all non-dismissed alert statuses based on current date
     * Runs every day at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * ?") // 2:00 AM daily
    @Transactional
    public void refreshAlertStatuses() {
        log.info("Starting expiry alert status refresh...");
        
        LocalDate today = LocalDate.now();
        LocalDate criticalThreshold = today.plusDays(7);
        LocalDate warningThreshold = today.plusDays(30);
        LocalDate upcomingThreshold = today.plusDays(90);
        
        List<ExpiryAlert> activeAlerts = expiryAlertRepository.findByIsDismissed(false);
        int updatedCount = 0;
        
        for (ExpiryAlert alert : activeAlerts) {
            if (alert.getExpiryDate() == null) continue;
            
            String newStatus = calculateStatus(
                alert.getExpiryDate(),
                today,
                criticalThreshold,
                warningThreshold,
                upcomingThreshold
            );
            
            if (!newStatus.equals(alert.getExpiryStatus())) {
                alert.setExpiryStatus(newStatus);
                updatedCount++;
            }
        }
        
        log.info("Refreshed {} expiry alerts, updated {} statuses", activeAlerts.size(), updatedCount);
    }
    
    private String calculateStatus(
            LocalDate expiryDate,
            LocalDate today,
            LocalDate criticalThreshold,
            LocalDate warningThreshold,
            LocalDate upcomingThreshold) {
        
        if (expiryDate.isBefore(today)) {
            return "EXPIRED";
        } else if (!expiryDate.isAfter(criticalThreshold)) {
            return "CRITICAL";
        } else if (!expiryDate.isAfter(warningThreshold)) {
            return "WARNING";
        } else if (!expiryDate.isAfter(upcomingThreshold)) {
            return "UPCOMING";
        } else {
            return "VALID";
        }
    }
}
