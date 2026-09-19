package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.job.OCIRestoreJob;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for manually triggering OCI restore operations
 * This allows disaster recovery by restoring images from OCI bucket to local storage
 */
@RestController
@RequestMapping("/api/v1/oci/restore")
@RequiredArgsConstructor
@Slf4j
public class OCIRestoreController {

    private final OCIRestoreJob ociRestoreJob;

    /**
     * Manually trigger the OCI restore job
     * This endpoint requires ADMIN role for security
     * Temporarily disabled for OCI authentication debugging
     */
    @PostMapping("/trigger")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<Map<String, Object>> triggerRestore() {
        log.info("Manual OCI restore triggered by admin");
        
        try {
            ociRestoreJob.restoreImagesFromOCI();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "OCI restore job triggered successfully");
            response.put("timestamp", java.time.Instant.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to trigger OCI restore: {}", e.getMessage(), e);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to trigger OCI restore: " + e.getMessage());
            response.put("timestamp", java.time.Instant.now());
            
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
