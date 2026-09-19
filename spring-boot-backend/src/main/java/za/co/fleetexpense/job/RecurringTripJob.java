package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.repository.OrganizationRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Scheduled job to generate trips from recurring trip templates
 * Runs daily at midnight to generate trips for the current day
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecurringTripJob {

    private final za.co.fleetexpense.service.RecurringTripService recurringTripService;
    private final OrganizationRepository organizationRepository;

    /**
     * Generate trips from recurring templates for all organizations
     * Runs daily at midnight (00:00)
     */
    @Scheduled(cron = "0 0 0 * * ?") // Every day at midnight
    @Transactional
    public void generateRecurringTrips() {
        log.info("Starting recurring trip generation for date: {}", LocalDate.now());
        
        LocalDate today = LocalDate.now();
        int totalGenerated = 0;
        
        // Get all organizations
        List<UUID> organizationIds = organizationRepository.findAll().stream()
                .map(org -> org.getId())
                .toList();
        
        for (UUID orgId : organizationIds) {
            try {
                recurringTripService.generateTripsFromRecurring(orgId, today);
                totalGenerated++;
                log.info("Generated recurring trips for organization: {}", orgId);
            } catch (Exception e) {
                log.error("Failed to generate recurring trips for organization {}: {}", orgId, e.getMessage());
            }
        }
        
        log.info("Recurring trip generation completed for {} organizations", totalGenerated);
    }
}
