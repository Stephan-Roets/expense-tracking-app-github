package za.co.fleetexpense.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Controller to serve images from legacy /uploads/ path format.
 * This handles old image URLs that were stored before the migration to /api/v1/storage/
 */
@Slf4j
@RestController
@RequestMapping("/uploads")
public class LegacyUploadsController {

    @Value("${storage.base-path:/app/storage}")
    private String basePath;

    @Value("${app.upload.dir:/app/uploads}")
    private String uploadDir;

    @RequestMapping(value = "/**", method = {RequestMethod.GET, RequestMethod.HEAD, RequestMethod.OPTIONS})
    public ResponseEntity<?> serveFile(HttpServletRequest request) {
        // Handle CORS preflight request
        if (request.getMethod().equals("OPTIONS")) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, "*")
                    .build();
        }
        String path = request.getRequestURI().substring("/uploads/".length());
        
        log.info("Serving file from legacy uploads path: {}", path);

        // First try the direct uploads directory
        try {
            Path directUploadPath = Paths.get(uploadDir, path);
            if (Files.exists(directUploadPath) && Files.isReadable(directUploadPath)) {
                log.info("Serving file from direct uploads path: {}", directUploadPath);
                String contentType = determineContentType(path);
                byte[] bytes = Files.readAllBytes(directUploadPath);

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, "*")
                        .body(bytes);
            }
        } catch (Exception e) {
            log.warn("Failed to read from uploads directory: {}", e.getMessage());
        }

        // Try local storage
        try {
            // Map legacy path to storage path
            // Legacy format: /uploads/vehicle-condition-images/{filename}
            // Storage format: {folder}/{userId}/{filename}
            // We'll try to find the file in the appropriate folder
            Path filePath = findFileInStorage(path);
            
            if (filePath != null && Files.exists(filePath) && Files.isReadable(filePath)) {
                log.info("Serving file from local storage: {}", filePath);
                String contentType = determineContentType(path);
                byte[] bytes = Files.readAllBytes(filePath);

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, "*")
                        .body(bytes);
            }
        } catch (Exception e) {
            log.warn("Failed to read from local storage: {}", e.getMessage());
        }
        
        log.warn("File not found in local storage: {}", path);
        return ResponseEntity.status(404).build();
    }
    
    private Path findFileInStorage(String legacyPath) {
        try {
            // First, try the direct legacy path (old uploads folder structure)
            Path directLegacyPath = Paths.get(basePath, "uploads", legacyPath);
            if (Files.exists(directLegacyPath) && Files.isReadable(directLegacyPath)) {
                log.info("Found file at direct legacy path: {}", directLegacyPath);
                return directLegacyPath;
            }
            
            // Extract filename from legacy path
            String filename = legacyPath.substring(legacyPath.lastIndexOf("/") + 1);
            
            // Try to find the file in common storage folders
            String[] folders = {
                "vehicle-condition-reports",
                "odometer-confirmations",
                "expenses-receipts",
                "driver-licenses"
            };
            
            for (String folder : folders) {
                // Try searching in the folder's subdirectories (user IDs)
                Path folderPath = Paths.get(basePath, folder);
                if (Files.exists(folderPath)) {
                    // Search recursively for the filename
                    Path foundFile = searchFile(folderPath, filename);
                    if (foundFile != null) {
                        return foundFile;
                    }
                }
            }
            
            // Also try direct path mapping for vehicle-condition-images in new structure
            if (legacyPath.startsWith("vehicle-condition-images/")) {
                Path directPath = Paths.get(basePath, "vehicle-condition-reports", legacyPath.substring("vehicle-condition-images/".length()));
                if (Files.exists(directPath)) {
                    return directPath;
                }
            }
            
        } catch (Exception e) {
            log.warn("Error searching for file: {}", e.getMessage());
        }
        return null;
    }
    
    private Path searchFile(Path directory, String filename) {
        try {
            if (!Files.exists(directory) || !Files.isDirectory(directory)) {
                return null;
            }
            
            // Search in immediate subdirectories
            java.util.stream.Stream<Path> stream = Files.list(directory);
            for (Path path : stream.toList()) {
                if (Files.isDirectory(path)) {
                    // Check if filename exists in this subdirectory
                    Path file = path.resolve(filename);
                    if (Files.exists(file)) {
                        stream.close();
                        return file;
                    }
                }
            }
            stream.close();
        } catch (Exception e) {
            log.warn("Error searching directory: {}", e.getMessage());
        }
        return null;
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
