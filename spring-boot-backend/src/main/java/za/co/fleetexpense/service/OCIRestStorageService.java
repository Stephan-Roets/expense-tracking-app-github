package za.co.fleetexpense.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

/**
 * OCI Object Storage Service - Swift-Compatible REST API Implementation
 * Uses OCI Customer Secret Key with HTTP Basic Auth for authentication
 * Bypasses OCI SDK compatibility issues with Spring Boot 3.x
 */
@Service
@Slf4j
public class OCIRestStorageService {

    @Value("${oci.access-key-id:}")
    private String accessKeyId;

    @Value("${oci.secret-access-key:}")
    private String secretAccessKey;

    @Value("${oci.region:af-johannesburg-1}")
    private String region;

    @Value("${oci.bucket-name:fleet-expense-backup}")
    private String bucketName;

    @Value("${oci.namespace:}")
    private String namespace;

    @Value("${oci.enabled:false}")
    private boolean ociEnabled;

    private final RestTemplate restTemplate;

    public OCIRestStorageService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Build the OCI Object Storage endpoint for an object
     */
    private String buildObjectEndpoint(String objectName) {
        return String.format("https://objectstorage.%s.oraclecloud.com/n/%s/b/%s/o/%s",
                region, namespace, bucketName, objectName);
    }

    /**
     * Build the OCI Object Storage endpoint for bucket operations
     */
    private String buildBucketEndpoint() {
        return String.format("https://objectstorage.%s.oraclecloud.com/n/%s/b/%s/o",
                region, namespace, bucketName);
    }

    /**
     * Get HTTP Basic Auth headers
     */
    private HttpHeaders getAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String auth = accessKeyId + ":" + secretAccessKey;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
        headers.set("Authorization", "Basic " + encodedAuth);
        return headers;
    }

    /**
     * Check if an object exists in the bucket
     */
    public boolean objectExists(String objectName) {
        if (!isConfigured()) {
            return false;
        }
        try {
            String endpoint = buildObjectEndpoint(objectName);
            HttpHeaders headers = getAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Void> response = restTemplate.exchange(endpoint, HttpMethod.HEAD, entity, Void.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                return false;
            }
            log.warn("Failed to check object existence: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("Failed to check object existence: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Upload a file to OCI Object Storage
     */
    public void uploadFile(String objectName, byte[] fileContent, String contentType) {
        if (!isConfigured()) {
            log.warn("OCI is disabled");
            return;
        }
        try {
            log.info("Uploading {} to OCI bucket using REST API with Customer Secret Key", objectName);
            
            String endpoint = buildObjectEndpoint(objectName);
            
            HttpHeaders headers = getAuthHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(fileContent.length);
            
            HttpEntity<byte[]> entity = new HttpEntity<>(fileContent, headers);
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.PUT, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully uploaded {} to OCI bucket", objectName);
            } else {
                throw new RuntimeException("Failed to upload to OCI: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to upload to OCI: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload to OCI: " + e.getMessage(), e);
        }
    }

    /**
     * Upload a local file to OCI Object Storage
     */
    public void uploadLocalFile(String localPath, String objectName) {
        try {
            Path filePath = Paths.get(localPath);
            byte[] fileContent = Files.readAllBytes(filePath);
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }
            uploadFile(objectName, fileContent, contentType);
        } catch (IOException e) {
            log.error("Failed to read local file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to read local file: " + e.getMessage(), e);
        }
    }

    /**
     * Download a file from OCI Object Storage
     */
    public byte[] downloadFile(String objectName) {
        if (!isConfigured()) {
            log.warn("OCI is disabled");
            return null;
        }
        try {
            log.info("Downloading {} from OCI bucket using REST API with Customer Secret Key", objectName);
            
            String endpoint = buildObjectEndpoint(objectName);
            HttpHeaders headers = getAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<byte[]> response = restTemplate.exchange(endpoint, HttpMethod.GET, entity, byte[].class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully downloaded {} from OCI bucket", objectName);
                return response.getBody();
            } else {
                throw new RuntimeException("Failed to download from OCI: " + response.getStatusCode());
            }
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                log.warn("Object not found: {}", objectName);
                return null;
            }
            throw new RuntimeException("Failed to download from OCI: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to download from OCI: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to download from OCI: " + e.getMessage(), e);
        }
    }

    /**
     * Download a file from OCI Object Storage and save to local path
     */
    public void downloadFileToLocal(String objectName, String localPath) {
        try {
            byte[] fileContent = downloadFile(objectName);
            Path filePath = Paths.get(localPath);
            
            // Create parent directories if they don't exist
            Files.createDirectories(filePath.getParent());
            
            Files.write(filePath, fileContent);
            log.info("Successfully saved {} to {}", objectName, localPath);
        } catch (IOException e) {
            log.error("Failed to save file locally: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save file locally: " + e.getMessage(), e);
        }
    }

    /**
     * List all objects in the bucket with a given prefix
     */
    public java.util.List<String> listObjects(String prefix) {
        if (!isConfigured()) {
            log.warn("OCI is disabled");
            return Collections.emptyList();
        }
        try {
            log.info("Listing objects with prefix: {}", prefix);
            
            String endpoint = buildBucketEndpoint() + "?prefix=" + prefix;
            HttpHeaders headers = getAuthHeaders();
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                // Parse the response to extract object names
                // OCI REST API returns XML with <Name> tags
                java.util.List<String> objectNames = new ArrayList<>();
                String body = response.getBody();
                if (body != null) {
                    // Simple parsing - extract object names from XML
                    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("<Name>([^<]+)</Name>");
                    java.util.regex.Matcher matcher = pattern.matcher(body);
                    while (matcher.find()) {
                        objectNames.add(matcher.group(1));
                    }
                }
                log.info("Found {} objects with prefix: {}", objectNames.size(), prefix);
                return objectNames;
            } else {
                throw new RuntimeException("Failed to list objects from OCI: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to list objects from OCI: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to list objects from OCI: " + e.getMessage(), e);
        }
    }

    /**
     * Check if OCI is configured
     */
    public boolean isConfigured() {
        return ociEnabled
                && accessKeyId != null && !accessKeyId.isEmpty()
                && secretAccessKey != null && !secretAccessKey.isEmpty()
                && region != null && !region.isEmpty()
                && namespace != null && !namespace.isEmpty()
                && bucketName != null && !bucketName.isEmpty();
    }
}

