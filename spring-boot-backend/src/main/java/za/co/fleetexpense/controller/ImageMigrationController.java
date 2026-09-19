package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.repository.EntryImageRepository;
import za.co.fleetexpense.service.OCIRestStorageService;

import java.util.List;

/**
 * Controller to migrate images from OCI Object Storage to local storage
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/migration")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class ImageMigrationController {

    private final EntryImageRepository entryImageRepository;
    private final OCIRestStorageService ociStorageService;

    @Value("${app.base-url:https://fleet-expense-app.duckdns.org}")
    private String baseUrl;

    @PostMapping("/images/oci-to-local")
    public ResponseEntity<MigrationResult> migrateImagesFromOCI() {
        log.info("Starting image migration from OCI to local storage");
        
        if (!ociStorageService.isConfigured()) {
            return ResponseEntity.badRequest().body(new MigrationResult(
                0, 0, "OCI is not configured"
            ));
        }

        int imagesMigrated = 0;
        int errors = 0;

        try {
            // Update EntryImages to use absolute URLs
            List<EntryImage> entryImages = entryImageRepository.findAll();
            log.info("Found {} EntryImage records to update", entryImages.size());

            for (EntryImage entryImage : entryImages) {
                try {
                    String imageUrl = entryImage.getImageUrl();
                    
                    // Skip if already using absolute URL and doesn't need path fix
                    if (imageUrl.startsWith("http") && !imageUrl.contains("/expenses-receipts/expenses/")) {
                        log.info("Skipping EntryImage {} - already using correct absolute URL", entryImage.getId());
                        continue;
                    }

                    // Convert relative URL to absolute URL or fix existing absolute URL
                    String newUrl;
                    if (imageUrl.startsWith("/api/v1/storage/")) {
                        newUrl = baseUrl + imageUrl;
                    } else if (imageUrl.startsWith("http")) {
                        newUrl = imageUrl;
                    } else {
                        log.warn("Skipping EntryImage {} - unexpected URL format: {}", entryImage.getId(), imageUrl);
                        continue;
                    }
                    
                    // Fix path: remove "expenses" subdirectory if present
                    // Database has: expenses-receipts/expenses/{userId}/{filename}
                    // Actual storage: expenses-receipts/{userId}/{filename}
                    newUrl = newUrl.replace("/expenses-receipts/expenses/", "/expenses-receipts/");
                    
                    entryImage.setImageUrl(newUrl);
                    entryImageRepository.save(entryImage);
                    
                    imagesMigrated++;
                    log.info("Updated EntryImage {} URL: {} -> {}", entryImage.getId(), imageUrl, newUrl);
                    
                } catch (Exception e) {
                    log.error("Failed to update EntryImage {}: {}", entryImage.getId(), e.getMessage(), e);
                    errors++;
                }
            }

            String message = String.format(
                "Migration complete: %d images updated to absolute URLs, %d errors",
                imagesMigrated, errors
            );

            log.info(message);
            return ResponseEntity.ok(new MigrationResult(imagesMigrated, errors, message));

        } catch (Exception e) {
            log.error("Migration failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(new MigrationResult(
                imagesMigrated, errors, "Migration failed: " + e.getMessage()
            ));
        }
    }

    record MigrationResult(
        int imagesMigrated,
        int errors,
        String message
    ) {}
}
