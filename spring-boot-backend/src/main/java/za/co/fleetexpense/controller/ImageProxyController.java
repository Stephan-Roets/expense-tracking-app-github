package za.co.fleetexpense.controller;

// OCI Image Proxy Controller - DISABLED due to Spring Boot 3.x compatibility issues
// To re-enable: Need to resolve JAX-RS Jakarta EE namespace conflicts with OCI SDK
/*
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.OCIRestStorageService;

import java.io.InputStream;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "OCI_ENABLED", havingValue = "true", matchIfMissing = false)
public class ImageProxyController {

    private final OCIRestStorageService ociRestStorageService;

    @GetMapping("/{objectKey:.+}")
    public ResponseEntity<?> getImage(
            @PathVariable String objectKey,
            @AuthenticationPrincipal UserPrincipal userDetails) {
        
        UUID userId = userDetails.getUserId();
        
        // Check if user has access to this object
        if (!ociRestStorageService.userHasAccessToObject(objectKey, userId)) {
            log.warn("User {} attempted to access unauthorized image: {}", userId, objectKey);
            return ResponseEntity.status(403).build();
        }
        
        try {
            InputStream imageStream = ociRestStorageService.downloadFile(objectKey);
            
            // Determine content type based on file extension
            String contentType = determineContentType(objectKey);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                    .body(new InputStreamResource(imageStream));
                    
        } catch (Exception e) {
            log.error("Failed to serve image: {}", objectKey, e);
            return ResponseEntity.status(500).build();
        }
    }
    
    private String determineContentType(String objectKey) {
        String lower = objectKey.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (lower.endsWith(".png")) {
            return "image/png";
        } else if (lower.endsWith(".gif")) {
            return "image/gif";
        } else if (lower.endsWith(".webp")) {
            return "image/webp";
        } else {
            return "application/octet-stream";
        }
    }
}
*/
