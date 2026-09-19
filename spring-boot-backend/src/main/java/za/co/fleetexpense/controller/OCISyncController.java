package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import za.co.fleetexpense.job.OCISyncJob;

/**
 * Controller to manually trigger OCI sync job for testing
 */
@RestController
@RequestMapping("/api/v1/admin/oci")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class OCISyncController {

    private final OCISyncJob ociSyncJob;

    @PostMapping("/sync")
    public ResponseEntity<String> triggerSync() {
        log.info("Manual OCI sync triggered via API");
        try {
            ociSyncJob.syncImagesToOCI();
            return ResponseEntity.ok("OCI sync completed successfully");
        } catch (Exception e) {
            log.error("Manual OCI sync failed", e);
            return ResponseEntity.internalServerError().body("OCI sync failed: " + e.getMessage());
        }
    }
}
