package za.co.fleetexpense.service;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * File Storage Service - Handles image/file uploads using local storage only
 * OCI integration disabled due to Spring Boot 3.x compatibility issues
 */
@Service
@Slf4j
public class StorageService {

    @Value("${storage.base-path:/app/storage}")
    private String basePath;

    @Value("${app.base-url:https://fleet-expense-app.duckdns.org}")
    private String baseUrl;

    public StorageService() {
    }

    @Data
    public static class UploadResult {
        private final String url;
        private final String key;
    }

    /**
     * Upload a file and return URL + key (local storage only)
     */
    public UploadResult uploadFile(MultipartFile file, String folder, UUID userId) {
        try {
            // For expenses-receipts, use flat "expenses" folder instead of UUID-based subfolder
            String subfolder = userId.toString();
            String urlSubfolder = userId.toString();
            
            if ("expenses-receipts".equals(folder)) {
                subfolder = "expenses";
                urlSubfolder = "expenses";
            }

            // Create storage directory
            Path storageDir = Paths.get(basePath, folder, subfolder);
            Files.createDirectories(storageDir);

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
            String filename = UUID.randomUUID().toString() + extension;

            // Save file
            Path targetPath = storageDir.resolve(filename);
            file.transferTo(targetPath.toFile());

            // Return URL and key (use absolute URL to work across different domains)
            String url = baseUrl + "/api/v1/storage/" + folder + "/" + urlSubfolder + "/" + filename;
            String key = urlSubfolder + "/" + filename;
            
            log.info("File uploaded to local storage: key={}, url={}", key, url);
            return new UploadResult(url, key);
        } catch (Exception e) {
            log.error("Local storage upload failed: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file to local storage: " + e.getMessage(), e);
        }
    }

    /**
     * Delete a file by key (local storage only)
     */
    public void deleteFile(String folder, String key) {
        try {
            Path filePath = Paths.get(basePath, folder, key);
            Files.deleteIfExists(filePath);
            log.info("File deleted from local storage: key={}", key);
        } catch (Exception e) {
            log.error("Failed to delete file from local storage", e);
            throw new RuntimeException("Failed to delete file from local storage: " + e.getMessage(), e);
        }
    }
}
