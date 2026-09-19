package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Scheduled job to delete pending user accounts that haven't been verified within 36 hours
 * Runs every hour to check for and remove stale pending accounts
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CleanupPendingUsersJob {

    private final UserRepository userRepository;
    private final OdometerVerificationRepository odometerVerificationRepository;

    /**
     * Delete pending user accounts older than 36 hours
     * Runs every hour
     */
    @Scheduled(cron = "0 0 * * * ?") // Every hour
    @Transactional
    public void cleanupPendingUsers() {
        log.info("Starting cleanup of pending user accounts...");
        
        OffsetDateTime cutoffTime = OffsetDateTime.now().minusHours(36);
        
        // Find pending users older than cutoff time
        List<UUID> pendingUserIds = userRepository.findIdsByEmailVerifiedFalseAndCreatedAtBefore(cutoffTime);
        
        if (!pendingUserIds.isEmpty()) {
            // Delete related odometer verifications first to avoid foreign key constraint violations
            for (UUID userId : pendingUserIds) {
                int deletedVerifications = odometerVerificationRepository.deleteByUserId(userId);
                log.info("Deleted {} odometer verifications for user {}", deletedVerifications, userId);
            }
            
            // Then delete the users
            int deletedCount = userRepository.deleteByEmailVerifiedFalseAndCreatedAtBefore(cutoffTime);
            log.info("Cleanup completed: {} pending user accounts deleted (older than 36 hours)", deletedCount);
        } else {
            log.info("No pending user accounts to clean up");
        }
    }
}
