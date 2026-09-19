package za.co.fleetexpense.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Controller to serve images from local storage.
 * OCI integration disabled due to Spring Boot 3.x compatibility issues.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/storage")
public class StorageProxyController {

    @Value("${storage.base-path:/app/storage}")
    private String basePath;

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        log.info("StorageProxyController test endpoint called");
        return ResponseEntity.ok("StorageProxyController is working");
    }

    // Redirect old /api/v1/uploads/** URLs to /api/v1/storage/**
    @RequestMapping(value = "/uploads/**", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<?> redirectOldUploads(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String path = request.getRequestURI().substring("/api/v1/uploads/".length());
        String newPath = "/api/v1/storage/" + path;
        log.info("Redirecting old upload URL: {} to: {}", request.getRequestURI(), newPath);
        response.sendRedirect(newPath);
        return ResponseEntity.status(302).build();
    }

    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<?> serveFile(HttpServletRequest request) {
        String path = request.getRequestURI().substring("/api/v1/storage/".length());

        log.info("Serving file from storage path: {}", path);

        // Validate path format (format: {folder}/{id}/{filename} or {folder}/{category}/{id}/{filename})
        // The ID can be either a user ID or organization ID
        // Also allow flat structure: {folder}/expenses/{filename} for expense receipts
        // Also allow: {folder}/vehicle-condition-images/{filename} for vehicle condition images
        try {
            String[] pathParts = path.split("/");
            if (pathParts.length < 2) {
                log.warn("Invalid path format, expected at least 2 parts: {}", path);
                return ResponseEntity.status(400).build();
            }
            // Validate that at least one of the path parts (after folder) is a valid UUID
            // This handles both formats: {folder}/{userId}/{filename} and {folder}/{category}/{userId}/{filename}
            // Also allow: {folder}/expenses/{filename} for flat expense receipt structure
            // Also allow: {folder}/vehicle-condition-images/{filename} for vehicle condition images
            boolean hasValidUuid = false;
            boolean isFlatExpensesPath = false;
            boolean isVehicleConditionImagesPath = false;

            // Check if first path part is "vehicle-condition-images" for flat structure
            if ("vehicle-condition-images".equals(pathParts[0]) && pathParts.length == 2) {
                isVehicleConditionImagesPath = true;
                // For vehicle condition images, the filename contains a UUID with prefix/suffix
                // Format: section-{sectionId}-{timestamp}.jpg
                // Extract the UUID from the filename
                String filename = pathParts[pathParts.length - 1];
                if (filename.startsWith("section-")) {
                    // Remove "section-" prefix and file extension
                    String withoutPrefix = filename.substring("section-".length());
                    int lastDotIndex = withoutPrefix.lastIndexOf('.');
                    if (lastDotIndex > 0) {
                        String withoutExtension = withoutPrefix.substring(0, lastDotIndex);
                        // The filename is now: {sectionId}-{timestamp}
                        // Split by last hyphen to separate UUID from timestamp
                        int lastHyphenIndex = withoutExtension.lastIndexOf('-');
                        if (lastHyphenIndex > 0) {
                            String uuidPart = withoutExtension.substring(0, lastHyphenIndex);
                            log.info("Extracted UUID part from filename '{}': {}", filename, uuidPart);
                            try {
                                UUID.fromString(uuidPart);
                                hasValidUuid = true;
                                log.info("Successfully validated UUID from vehicle condition image: {}", uuidPart);
                            } catch (IllegalArgumentException ex) {
                                log.warn("Failed to parse UUID from vehicle condition image filename '{}', extracted part: '{}'", filename, uuidPart);
                            }
                        }
                    }
                }
            }

            for (int i = 1; i < pathParts.length; i++) {
                try {
                    UUID.fromString(pathParts[i]);
                    hasValidUuid = true;
                    break;
                } catch (IllegalArgumentException e) {
                    // Not a UUID, check if it's the "expenses" category for flat structure
                    if ("expenses".equals(pathParts[i]) && pathParts.length >= 3) {
                        isFlatExpensesPath = true;
                    }
                }
            }

            // For vehicle condition images, we've already validated the folder structure
            // so we can proceed even if UUID parsing failed
            if (isVehicleConditionImagesPath) {
                hasValidUuid = true;
            }
            
            if (!hasValidUuid && !isFlatExpensesPath && !isVehicleConditionImagesPath) {
                log.warn("No valid UUID found in path: {}", path);
                return ResponseEntity.status(400).build();
            }
        } catch (Exception e) {
            log.warn("Invalid path format: {}", path);
            return ResponseEntity.status(400).build();
        }
        
        // Try local storage first
        try {
            Path filePath = Paths.get(basePath, path);
            
            if (Files.exists(filePath) && Files.isReadable(filePath)) {
                log.info("Serving file from local storage: {}", filePath);
                String contentType = determineContentType(path);
                byte[] bytes = Files.readAllBytes(filePath);
                
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                        .body(bytes);
            }
        } catch (Exception e) {
            log.warn("Failed to read from local storage: {}", e.getMessage());
        }
        
        log.warn("File not found in local storage: {}", path);
        return ResponseEntity.status(404).build();
    }
    
    private String determineContentType(String path) {
        String extension = path.substring(path.lastIndexOf(".") + 1).toLowerCase();
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "avif" -> "image/avif";
            default -> "application/octet-stream";
        };
    }
}
