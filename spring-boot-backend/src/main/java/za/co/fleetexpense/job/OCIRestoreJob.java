package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.repository.EntryImageRepository;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.service.OCIRestStorageService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Scheduled job to restore images from OCI Object Storage bucket to local storage
 * This job is NOT scheduled by default - it should be triggered manually when needed
 * for disaster recovery purposes
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OCIRestoreJob {

    private final EntryImageRepository entryImageRepository;
    private final OdometerVerificationRepository odometerVerificationRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ExpenseRepository expenseRepository;
    private final OCIRestStorageService ociStorageService;

    @Value("${storage.base-path:/app/storage}")
    private String storageBasePath;

    @Value("${oci.enabled:false}")
    private boolean ociEnabled;

    /**
     * Restore images from OCI bucket to local storage
     * This job is NOT scheduled by default - comment out @Scheduled to disable automatic execution
     * To run manually, call this method via a REST endpoint or trigger it manually
     * Restores all image types:
     * - expenses-receipts (EntryImage)
     * - expenses-receipts (Expense.receipt_image_url)
     * - odometer-readings-for-tax-readiness-audit (OdometerVerification)
     * - profile-photos (User.profilePhotoUrl)
     * - organization-logos (Organization.logoUrl)
     */
    @Scheduled(cron = "0 0 4 * * ?") // 4am daily - ENABLED to restore from backup
    @Transactional
    public void restoreImagesFromOCI() {
        if (!ociEnabled) {
            log.info("OCI restore job skipped - OCI is disabled");
            return;
        }

        if (!ociStorageService.isConfigured()) {
            log.warn("OCI restore job skipped - OCI is not properly configured");
            return;
        }

        log.info("Starting OCI image restore job...");

        try {
            int totalSuccess = 0;
            int totalFailure = 0;
            int totalSkipped = 0;

            // Restore expense receipts and odometer readings (EntryImage)
            RestoreResult entryImageResult = restoreEntryImages();
            totalSuccess += entryImageResult.success;
            totalFailure += entryImageResult.failure;
            totalSkipped += entryImageResult.skipped;

            // Restore expense receipts (Expense.receipt_image_url)
            RestoreResult expenseResult = restoreExpenseReceipts();
            totalSuccess += expenseResult.success;
            totalFailure += expenseResult.failure;
            totalSkipped += expenseResult.skipped;

            // Restore odometer verification images for tax readiness
            RestoreResult odometerResult = restoreOdometerVerifications();
            totalSuccess += odometerResult.success;
            totalFailure += odometerResult.failure;
            totalSkipped += odometerResult.skipped;

            // Restore user profile photos
            RestoreResult profilePhotoResult = restoreProfilePhotos();
            totalSuccess += profilePhotoResult.success;
            totalFailure += profilePhotoResult.failure;
            totalSkipped += profilePhotoResult.skipped;

            // Restore organization logos
            RestoreResult logoResult = restoreOrganizationLogos();
            totalSuccess += logoResult.success;
            totalFailure += logoResult.failure;
            totalSkipped += logoResult.skipped;

            log.info("OCI image restore job completed - Total Success: {}, Total Skipped: {}, Total Failed: {}", 
                    totalSuccess, totalSkipped, totalFailure);

        } catch (Exception e) {
            log.error("OCI image restore job failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Restore EntryImage records (expense receipts and odometer readings)
     */
    private RestoreResult restoreEntryImages() {
        log.info("Restoring EntryImage records (expenses-receipts)...");
        RestoreResult result = new RestoreResult();

        try {
            List<EntryImage> imagesToRestore = entryImageRepository.findByImageKeyContaining("expenses-receipts/");

            if (imagesToRestore.isEmpty()) {
                log.info("No EntryImage records to restore");
                return result;
            }

            log.info("Found {} EntryImage records to restore", imagesToRestore.size());

            for (EntryImage image : imagesToRestore) {
                try {
                    String ociKey = image.getImageKey();
                    if (ociKey == null || !ociKey.contains("expenses-receipts/")) {
                        log.warn("Skipping EntryImage {} - no valid OCI key found", image.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract the local key from the OCI key
                    // OCI key format: expenses-receipts/{folder}/{userId}/{filename}
                    // Local key format: {userId}/{filename}
                    String localKey = extractLocalKeyFromOciKey(ociKey);
                    
                    // Build local file path
                    String localPath = Paths.get(storageBasePath, "expenses-receipts", localKey).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file already exists
                    if (Files.exists(filePath)) {
                        log.info("Skipping EntryImage {} - local file already exists: {}", image.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Download from OCI
                    ociStorageService.downloadFileToLocal(ociKey, localPath);

                    // Keep OCI key in database for duplicate detection
                    // Do NOT update imageKey - this ensures future syncs don't re-upload

                    result.success++;
                    log.info("Successfully restored EntryImage {} from OCI to local: {}", image.getId(), localPath);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to restore EntryImage {} from OCI: {}", image.getId(), e.getMessage(), e);
                }
            }

            log.info("EntryImage restore completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("EntryImage restore failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Restore Expense receipt images (expenses.receipt_image_url)
     */
    private RestoreResult restoreExpenseReceipts() {
        log.info("Restoring Expense receipt images (expenses.receipt_image_url)...");
        RestoreResult result = new RestoreResult();

        try {
            List<Expense> expensesToRestore = expenseRepository.findAll().stream()
                    .filter(e -> e.getReceiptImageKey() != null && e.getReceiptImageKey().contains("expenses-receipts/"))
                    .toList();

            if (expensesToRestore.isEmpty()) {
                log.info("No Expense receipt images to restore");
                return result;
            }

            log.info("Found {} Expense receipt images to restore", expensesToRestore.size());

            for (Expense expense : expensesToRestore) {
                try {
                    String ociKey = expense.getReceiptImageKey();
                    if (ociKey == null || !ociKey.contains("expenses-receipts/")) {
                        log.warn("Skipping Expense {} - no valid OCI key found", expense.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract the local key from the OCI key
                    // OCI key format: expenses-receipts/{folder}/{userId}/{filename}
                    // Local key format: {userId}/{filename}
                    String localKey = extractLocalKeyFromOciKey(ociKey);
                    
                    // Build local file path
                    String localPath = Paths.get(storageBasePath, "expenses-receipts", localKey).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file already exists
                    if (Files.exists(filePath)) {
                        log.info("Skipping Expense {} - local file already exists: {}", expense.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Download from OCI
                    ociStorageService.downloadFileToLocal(ociKey, localPath);

                    // Update receipt_image_url to point to local storage
                    String localUrl = "https://fleet-expense-app.duckdns.org/api/v1/storage/expenses-receipts/" + localKey;
                    expense.setReceiptImageUrl(localUrl);
                    expenseRepository.save(expense);

                    result.success++;
                    log.info("Successfully restored Expense {} receipt from OCI to local: {}", expense.getId(), localPath);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to restore Expense {} receipt from OCI: {}", expense.getId(), e.getMessage(), e);
                }
            }

            log.info("Expense receipt restore completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("Expense receipt restore failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Restore OdometerVerification records (odometer-readings-for-tax-readiness-audit)
     */
    private RestoreResult restoreOdometerVerifications() {
        log.info("Restoring OdometerVerification records (odometer-readings-for-tax-readiness-audit)...");
        RestoreResult result = new RestoreResult();

        try {
            List<OdometerVerification> verificationsToRestore = odometerVerificationRepository.findAll().stream()
                    .filter(v -> v.getImageKey() != null && v.getImageKey().contains("odometer-readings-for-tax-readiness-audit/"))
                    .toList();

            if (verificationsToRestore.isEmpty()) {
                log.info("No OdometerVerification records to restore");
                return result;
            }

            log.info("Found {} OdometerVerification records to restore", verificationsToRestore.size());

            for (OdometerVerification verification : verificationsToRestore) {
                try {
                    String ociKey = verification.getImageKey();
                    if (ociKey == null || !ociKey.contains("odometer-readings-for-tax-readiness-audit/")) {
                        log.warn("Skipping OdometerVerification {} - no valid OCI key found", verification.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract the local key from the OCI key
                    // OCI key format: odometer-readings-for-tax-readiness-audit/{userId}/{filename}
                    // Local key format: {userId}/{filename}
                    String localKey = extractLocalKeyFromOciKey(ociKey, "odometer-readings-for-tax-readiness-audit");
                    
                    // Build local file path
                    String localPath = Paths.get(storageBasePath, "odometer-readings-for-tax-readiness-audit", localKey).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file already exists
                    if (Files.exists(filePath)) {
                        log.info("Skipping OdometerVerification {} - local file already exists: {}", verification.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Download from OCI
                    ociStorageService.downloadFileToLocal(ociKey, localPath);

                    // Keep OCI key in database for duplicate detection
                    // Do NOT update imageKey - this ensures future syncs don't re-upload

                    result.success++;
                    log.info("Successfully restored OdometerVerification {} from OCI to local: {}", verification.getId(), localPath);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to restore OdometerVerification {} from OCI: {}", verification.getId(), e.getMessage(), e);
                }
            }

            log.info("OdometerVerification restore completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("OdometerVerification restore failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Restore User profile photos (profile-photos)
     */
    private RestoreResult restoreProfilePhotos() {
        log.info("Restoring User profile photos (profile-photos)...");
        RestoreResult result = new RestoreResult();

        try {
            List<User> usersToRestore = userRepository.findAll().stream()
                    .filter(u -> u.getProfilePhotoUrl() != null && u.getProfilePhotoUrl().contains("profile-photos/"))
                    .toList();

            if (usersToRestore.isEmpty()) {
                log.info("No User profile photos to restore");
                return result;
            }

            log.info("Found {} User profile photos to restore", usersToRestore.size());

            for (User user : usersToRestore) {
                try {
                    String profilePhotoUrl = user.getProfilePhotoUrl();
                    if (profilePhotoUrl == null || !profilePhotoUrl.contains("profile-photos/")) {
                        log.warn("Skipping User {} - no valid profile photo URL found", user.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract key from URL
                    String localKey = extractKeyFromUrl(profilePhotoUrl);
                    if (localKey == null || localKey.isEmpty()) {
                        log.warn("Skipping User {} - could not extract key from URL", user.getId());
                        result.skipped++;
                        continue;
                    }

                    // Build OCI object name
                   	String ociObjectName = "profile-photos/" + localKey;

                    // Build local file path
                    String localPath = Paths.get(storageBasePath, "profile-photos", localKey).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file already exists
                    if (Files.exists(filePath)) {
                        log.info("Skipping User {} - local file already exists: {}", user.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Download from OCI
                    ociStorageService.downloadFileToLocal(ociObjectName, localPath);

                    // Keep OCI key in database for duplicate detection
                    // Do NOT update profilePhotoUrl - this ensures future syncs don't re-upload

                    result.success++;
                    log.info("Successfully restored User {} profile photo from OCI to local: {}", user.getId(), localPath);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to restore User {} profile photo from OCI: {}", user.getId(), e.getMessage(), e);
                }
            }

            log.info("User profile photo restore completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("User profile photo restore failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Restore Organization logos (organization-logos)
     */
    private RestoreResult restoreOrganizationLogos() {
        log.info("Restoring Organization logos (organization-logos)...");
        RestoreResult result = new RestoreResult();

        try {
            List<Organization> orgsToRestore = organizationRepository.findAll().stream()
                    .filter(o -> o.getLogoUrl() != null && o.getLogoUrl().contains("organization-logos/"))
                    .toList();

            if (orgsToRestore.isEmpty()) {
                log.info("No Organization logos to restore");
                return result;
            }

            log.info("Found {} Organization logos to restore", orgsToRestore.size());

            for (Organization org : orgsToRestore) {
                try {
                    String logoUrl = org.getLogoUrl();
                    if (logoUrl == null || !logoUrl.contains("organization-logos/")) {
                        log.warn("Skipping Organization {} - no valid logo URL found", org.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract key from URL
                    String localKey = extractKeyFromUrl(logoUrl);
                    if (localKey == null || localKey.isEmpty()) {
                        log.warn("Skipping Organization {} - could not extract key from URL", org.getId());
                        result.skipped++;
                        continue;
                    }

                    // Build OCI object name
                    String ociObjectName = "organization-logos/" + localKey;

                    // Build local file path
                    String localPath = Paths.get(storageBasePath, "organization-logos", localKey).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file already exists
                    if (Files.exists(filePath)) {
                        log.info("Skipping Organization {} - local file already exists: {}", org.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Download from OCI
                    ociStorageService.downloadFileToLocal(ociObjectName, localPath);

                    // Keep OCI key in database for duplicate detection
                    // Do NOT update logoUrl - this ensures future syncs don't re-upload

                    result.success++;
                    log.info("Successfully restored Organization {} logo from OCI to local: {}", org.getId(), localPath);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to restore Organization {} logo from OCI: {}", org.getId(), e.getMessage(), e);
                }
            }

            log.info("Organization logo restore completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("Organization logo restore failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Extract local key from OCI key for EntryImage
     * OCI key: expenses-receipts/expenses/{userId}/{filename}
     * Local key: {userId}/{filename}
     */
    private String extractLocalKeyFromOciKey(String ociKey) {
        // Remove the "expenses-receipts/{folder}/" prefix
        String[] parts = ociKey.split("/");
        if (parts.length >= 4) {
            // parts[0] = expenses-receipts, parts[1] = expenses/odometer, parts[2] = userId, parts[3+] = filename
            return String.join("/", java.util.Arrays.copyOfRange(parts, 2, parts.length));
        }
        return ociKey;
    }

    /**
     * Extract local key from OCI key with custom folder prefix
     * OCI key: {folder}/{userId}/{filename}
     * Local key: {userId}/{filename}
     */
    private String extractLocalKeyFromOciKey(String ociKey, String folder) {
        // Remove the folder prefix
        String[] parts = ociKey.split("/");
        if (parts.length >= 3 && parts[0].equals(folder)) {
            // parts[0] = folder, parts[1] = userId, parts[2+] = filename
            return String.join("/", java.util.Arrays.copyOfRange(parts, 1, parts.length));
        }
        return ociKey;
    }

    /**
     * Extract local key from storage URL
     * URL format: https://fleet-expense-app.duckdns.org/api/v1/storage/{folder}/{userId}/{filename}
     * Key format: {userId}/{filename}
     */
    private String extractKeyFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        try {
            String[] parts = url.split("/storage/");
            if (parts.length >= 2) {
                String[] keyParts = parts[1].split("/");
                if (keyParts.length >= 2) {
                    // Return everything after the folder name
                    return String.join("/", java.util.Arrays.copyOfRange(keyParts, 1, keyParts.length));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract key from URL: {}", url);
        }
        return null;
    }

    /**
     * Helper class to track restore results
     */
    private static class RestoreResult {
        int success = 0;
        int failure = 0;
        int skipped = 0;
    }
}
