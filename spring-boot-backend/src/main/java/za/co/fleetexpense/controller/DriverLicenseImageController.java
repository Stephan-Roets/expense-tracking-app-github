package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.StorageService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/driver-license-images")
@RequiredArgsConstructor
@Slf4j
public class DriverLicenseImageController {

    private final StorageService storageService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> uploadLicenseImage(
            @RequestParam MultipartFile file,
            @RequestParam String type,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        log.info("Uploading driver license image: type={}, userId={}", type, principal.getUserId());
        
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File cannot be empty"));
        }
        
        if (!type.equals("front") && !type.equals("back")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Type must be 'front' or 'back'"));
        }
        
        try {
            String folder = "driver-licenses";
            StorageService.UploadResult result = storageService.uploadFile(file, folder, principal.getUserId());
            
            log.info("Driver license image uploaded: key={}, url={}", result.getKey(), result.getUrl());
            
            return ResponseEntity.ok(Map.of(
                "url", result.getUrl(),
                "key", result.getKey()
            ));
        } catch (Exception e) {
            log.error("Failed to upload driver license image: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload image: " + e.getMessage()));
        }
    }
}
