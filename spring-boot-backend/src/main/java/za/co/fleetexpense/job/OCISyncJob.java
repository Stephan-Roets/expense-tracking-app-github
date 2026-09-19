package za.co.fleetexpense.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.repository.EntryImageRepository;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.service.OCIRestStorageService;

import jakarta.annotation.PostConstruct;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Scheduled job to sync local images to OCI Object Storage bucket
 * Runs daily at 4am to upload new images that haven't been synced to OCI yet
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OCISyncJob {

    private final EntryImageRepository entryImageRepository;
    private final ExpenseRepository expenseRepository;
    private final OdometerVerificationRepository odometerVerificationRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OCIRestStorageService ociStorageService;

    @Value("${storage.base-path:/app/storage}")
    private String storageBasePath;

    @Value("${oci.enabled:false}")
    private boolean ociEnabled;

    @PostConstruct
    public void init() {
        log.info("OCISyncJob bean initialized - OCI enabled: {}", ociEnabled);
    }

    /**
     * Sync local images to OCI bucket
     * Runs daily at 4am
     * Syncs all image types:
     * - expenses-receipts (EntryImage)
     * - odometer-readings-for-tax-readiness-audit (OdometerVerification)
     * - profile-photos (User.profilePhotoUrl)
     * - organization-logos (Organization.logoUrl)
     */
    @Scheduled(cron = "0 0 4 * * ?") // Daily at 4am
    @Transactional
    public void syncImagesToOCI() {
        if (!ociEnabled) {
            log.info("OCI sync job skipped - OCI is disabled");
            return;
        }

        if (!ociStorageService.isConfigured()) {
            log.warn("OCI sync job skipped - OCI is not properly configured");
            return;
        }

        log.info("Starting OCI image sync job...");

        try {
            int totalSuccess = 0;
            int totalFailure = 0;
            int totalSkipped = 0;

            // Sync expense receipts and odometer readings (EntryImage)
            SyncResult entryImageResult = syncEntryImages();
            totalSuccess += entryImageResult.success;
            totalFailure += entryImageResult.failure;
            totalSkipped += entryImageResult.skipped;

            // Sync odometer verification images for tax readiness
            SyncResult odometerResult = syncOdometerVerifications();
            totalSuccess += odometerResult.success;
            totalFailure += odometerResult.failure;
            totalSkipped += odometerResult.skipped;

            // Sync user profile photos
            SyncResult profilePhotoResult = syncProfilePhotos();
            totalSuccess += profilePhotoResult.success;
            totalFailure += profilePhotoResult.failure;
            totalSkipped += profilePhotoResult.skipped;

            // Sync organization logos
            SyncResult logoResult = syncOrganizationLogos();
            totalSuccess += logoResult.success;
            totalFailure += logoResult.failure;
            totalSkipped += logoResult.skipped;

            log.info("OCI sync job completed - Total Success: {}, Total Skipped: {}, Total Failed: {}", 
                    totalSuccess, totalSkipped, totalFailure);

        } catch (Exception e) {
            log.error("OCI sync job failed: {}", e.getMessage(), e);
        }
    }

    /**
     * Sync EntryImage records (expense receipts and odometer readings)
     */
    private SyncResult syncEntryImages() {
        log.info("Syncing EntryImage records (expenses-receipts)...");
        SyncResult result = new SyncResult();

        try {
            List<EntryImage> imagesToSync = entryImageRepository.findByImageKeyNotNullAndImageUrlNotContainingObjectStorage();

            if (imagesToSync.isEmpty()) {
                log.info("No EntryImage records to sync");
                return result;
            }

            log.info("Found {} EntryImage records to sync", imagesToSync.size());

            for (EntryImage image : imagesToSync) {
                try {
                    String localKey = image.getImageKey();
                    if (localKey == null || localKey.isEmpty()) {
                        log.warn("Skipping EntryImage {} - no local key found", image.getId());
                        result.skipped++;
                        continue;
                    }

                    // Get the expense to find the user_id
                    Expense expense = expenseRepository.findById(image.getEntryId()).orElse(null);
                    if (expense == null) {
                        log.warn("Skipping EntryImage {} - expense not found: {}", image.getId(), image.getEntryId());
                        result.skipped++;
                        continue;
                    }

                    // Extract just the filename from the image_key
                    String filename = localKey;
                    if (localKey.startsWith("/api/v1/storage/entry-images/")) {
                        // Format: /api/v1/storage/entry-images/{org_id}/{filename}
                        String[] parts = localKey.split("/");
                        filename = parts[parts.length - 1];
                    } else if (localKey.contains("/")) {
                        // Format: {org_id}/{filename}
                        String[] parts = localKey.split("/");
                        filename = parts[parts.length - 1];
                    }

                    // Build local file path using expense's user_id
                    String localPath = Paths.get(storageBasePath, "expenses-receipts", expense.getUser().getId().toString(), filename).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file exists
                    if (!Files.exists(filePath)) {
                        log.warn("Skipping EntryImage {} - local file not found: {}", image.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Build OCI object name with folder structure based on entry type
                    String folder = image.getEntryType() == za.co.fleetexpense.entity.enums.EntryType.EXPENSE ? 
                            "expenses" : "odometer";
                    String ociObjectName = "expenses-receipts/" + folder + "/" + filename;

                    // Check if image has already been synced to OCI (duplicate detection)
                    if (image.getImageKey() != null && !image.getImageKey().isEmpty()) {
                        log.info("Skipping EntryImage {} - already synced to OCI: {}", image.getId(), image.getImageKey());
                        result.skipped++;
                        continue;
                    }

                    // Upload to OCI
                    ociStorageService.uploadLocalFile(localPath, ociObjectName);

                    // Update EntryImage with OCI key
                    image.setImageKey(ociObjectName);
                    entryImageRepository.save(image);

                    result.success++;
                    log.info("Successfully synced EntryImage {} to OCI: {}", image.getId(), ociObjectName);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to sync EntryImage {} to OCI: {}", image.getId(), e.getMessage(), e);
                }
            }

            log.info("EntryImage sync completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("EntryImage sync failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Sync OdometerVerification records (odometer-readings-for-tax-readiness-audit)
     */
    private SyncResult syncOdometerVerifications() {
        log.info("Syncing OdometerVerification records (odometer-readings-for-tax-readiness-audit)...");
        SyncResult result = new SyncResult();

        try {
            List<OdometerVerification> verificationsToSync = odometerVerificationRepository.findAll().stream()
                    .filter(v -> v.getImageKey() != null && !v.getImageKey().contains("odometer-readings-for-tax-readiness-audit/"))
                    .toList();

            if (verificationsToSync.isEmpty()) {
                log.info("No OdometerVerification records to sync");
                return result;
            }

            log.info("Found {} OdometerVerification records to sync", verificationsToSync.size());

            for (OdometerVerification verification : verificationsToSync) {
                try {
                    String localKey = verification.getImageKey();
                    if (localKey == null || localKey.isEmpty()) {
                        log.warn("Skipping OdometerVerification {} - no local key found", verification.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract just the filename from the image_key
                    String filename = localKey;
                    if (localKey.startsWith("/api/v1/storage/odometer-readings/")) {
                        // Format: /api/v1/storage/odometer-readings/{user_id}/{filename}
                        String[] parts = localKey.split("/");
                        filename = parts[parts.length - 1];
                    } else if (localKey.contains("/")) {
                        // Format: {user_id}/{filename}
                        String[] parts = localKey.split("/");
                        filename = parts[parts.length - 1];
                    }

                    // Build local file path using verification's user_id
                    String localPath = Paths.get(storageBasePath, "odometer-readings-for-tax-readiness-audit", verification.getUser().getId().toString(), filename).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file exists
                    if (!Files.exists(filePath)) {
                        log.warn("Skipping OdometerVerification {} - local file not found: {}", verification.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Build OCI object name
                    String ociObjectName = "odometer-readings-for-tax-readiness-audit/" + filename;

                    // Check if verification has already been synced to OCI (duplicate detection)
                    if (verification.getImageKey() != null && verification.getImageKey().contains("odometer-readings-for-tax-readiness-audit/")) {
                        log.info("Skipping OdometerVerification {} - already synced to OCI: {}", verification.getId(), verification.getImageKey());
                        result.skipped++;
                        continue;
                    }

                    // Upload to OCI
                    ociStorageService.uploadLocalFile(localPath, ociObjectName);

                    // Update OdometerVerification with OCI key
                    verification.setImageKey(ociObjectName);
                    odometerVerificationRepository.save(verification);

                    result.success++;
                    log.info("Successfully synced OdometerVerification {} to OCI: {}", verification.getId(), ociObjectName);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to sync OdometerVerification {} to OCI: {}", verification.getId(), e.getMessage(), e);
                }
            }

            log.info("OdometerVerification sync completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("OdometerVerification sync failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Sync User profile photos (profile-photos)
     */
    private SyncResult syncProfilePhotos() {
        log.info("Syncing User profile photos (profile-photos)...");
        SyncResult result = new SyncResult();

        try {
            List<User> usersToSync = userRepository.findAll().stream()
                    .filter(u -> u.getProfilePhotoUrl() != null && !u.getProfilePhotoUrl().contains("profile-photos/"))
                    .toList();

            if (usersToSync.isEmpty()) {
                log.info("No User profile photos to sync");
                return result;
            }

            log.info("Found {} User profile photos to sync", usersToSync.size());

            for (User user : usersToSync) {
                try {
                    String profilePhotoUrl = user.getProfilePhotoUrl();
                    if (profilePhotoUrl == null || profilePhotoUrl.isEmpty()) {
                        log.warn("Skipping User {} - no profile photo URL found", user.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract just the filename from the URL
                    String filename = profilePhotoUrl;
                    if (profilePhotoUrl.startsWith("/api/v1/storage/profile-photos/")) {
                        // Format: /api/v1/storage/profile-photos/{user_id}/{filename}
                        String[] parts = profilePhotoUrl.split("/");
                        filename = parts[parts.length - 1];
                    } else if (profilePhotoUrl.contains("profile-photos/")) {
                        // Format: https://.../profile-photos/{user_id}/{filename}
                        String[] parts = profilePhotoUrl.split("/");
                        filename = parts[parts.length - 1];
                    }

                    // Build local file path using user_id
                    String localPath = Paths.get(storageBasePath, "profile-photos", user.getId().toString(), filename).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file exists
                    if (!Files.exists(filePath)) {
                        log.warn("Skipping User {} - local file not found: {}", user.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Build OCI object name
                    String ociObjectName = "profile-photos/" + filename;

                    // Check if user profile photo has already been synced to OCI (duplicate detection)
                    if (user.getProfilePhotoUrl() != null && user.getProfilePhotoUrl().contains("profile-photos/")) {
                        log.info("Skipping User {} - profile photo already synced to OCI: {}", user.getId(), user.getProfilePhotoUrl());
                        result.skipped++;
                        continue;
                    }

                    // Upload to OCI
                    ociStorageService.uploadLocalFile(localPath, ociObjectName);

                    // Update User profile photo URL with OCI path
                    String newUrl = "https://fleet-expense-app.duckdns.org/api/v1/storage/profile-photos/" + filename;
                    user.setProfilePhotoUrl(newUrl);
                    userRepository.save(user);

                    result.success++;
                    log.info("Successfully synced User {} profile photo to OCI: {}", user.getId(), ociObjectName);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to sync User {} profile photo to OCI: {}", user.getId(), e.getMessage(), e);
                }
            }

            log.info("User profile photo sync completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("User profile photo sync failed: {}", e.getMessage(), e);
        }

        return result;
    }

    /**
     * Sync Organization logos (organization-logos)
     */
    private SyncResult syncOrganizationLogos() {
        log.info("Syncing Organization logos (organization-logos)...");
        SyncResult result = new SyncResult();

        try {
            List<Organization> orgsToSync = organizationRepository.findAll().stream()
                    .filter(o -> o.getLogoUrl() != null && !o.getLogoUrl().contains("organization-logos/"))
                    .toList();

            if (orgsToSync.isEmpty()) {
                log.info("No Organization logos to sync");
                return result;
            }

            log.info("Found {} Organization logos to sync", orgsToSync.size());

            for (Organization org : orgsToSync) {
                try {
                    String logoUrl = org.getLogoUrl();
                    if (logoUrl == null || logoUrl.isEmpty()) {
                        log.warn("Skipping Organization {} - no logo URL found", org.getId());
                        result.skipped++;
                        continue;
                    }

                    // Extract just the filename from the URL
                    String filename = logoUrl;
                    if (logoUrl.startsWith("/api/v1/storage/organization-logos/")) {
                        // Format: /api/v1/storage/organization-logos/{org_id}/{filename}
                        String[] parts = logoUrl.split("/");
                        filename = parts[parts.length - 1];
                    } else if (logoUrl.contains("organization-logos/")) {
                        // Format: https://.../organization-logos/{org_id}/{filename}
                        String[] parts = logoUrl.split("/");
                        filename = parts[parts.length - 1];
                    }

                    // Build local file path using organization_id
                    String localPath = Paths.get(storageBasePath, "organization-logos", org.getId().toString(), filename).toString();
                    Path filePath = Paths.get(localPath);

                    // Check if local file exists
                    if (!Files.exists(filePath)) {
                        log.warn("Skipping Organization {} - local file not found: {}", org.getId(), localPath);
                        result.skipped++;
                        continue;
                    }

                    // Build OCI object name
                    String ociObjectName = "organization-logos/" + filename;

                    // Check if organization logo has already been synced to OCI (duplicate detection)
                    if (org.getLogoUrl() != null && org.getLogoUrl().contains("organization-logos/")) {
                        log.info("Skipping Organization {} - logo already synced to OCI: {}", org.getId(), org.getLogoUrl());
                        result.skipped++;
                        continue;
                    }

                    // Upload to OCI
                    ociStorageService.uploadLocalFile(localPath, ociObjectName);

                    // Update Organization logo URL with OCI path
                    String newUrl = "https://fleet-expense-app.duckdns.org/api/v1/storage/organization-logos/" + filename;
                    org.setLogoUrl(newUrl);
                    organizationRepository.save(org);

                    result.success++;
                    log.info("Successfully synced Organization {} logo to OCI: {}", org.getId(), ociObjectName);

                } catch (Exception e) {
                    result.failure++;
                    log.error("Failed to sync Organization {} logo to OCI: {}", org.getId(), e.getMessage(), e);
                }
            }

            log.info("Organization logo sync completed - Success: {}, Skipped: {}, Failed: {}", 
                    result.success, result.skipped, result.failure);

        } catch (Exception e) {
            log.error("Organization logo sync failed: {}", e.getMessage(), e);
        }

        return result;
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
     * Helper class to track sync results
     */
    private static class SyncResult {
        int success = 0;
        int failure = 0;
        int skipped = 0;
    }
}
