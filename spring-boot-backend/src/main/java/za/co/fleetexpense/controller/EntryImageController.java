package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.enums.EntryType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.EntryImageService;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/entry-images")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class EntryImageController {

    private final EntryImageService entryImageService;

    @GetMapping("/entry/{entryType}/{entryId}")
    public ResponseEntity<List<EntryImage>> getImagesByEntry(
            @PathVariable EntryType entryType,
            @PathVariable UUID entryId) {
        return ResponseEntity.ok(entryImageService.getByEntry(entryType, entryId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EntryImage> getImageById(@PathVariable UUID id) {
        return ResponseEntity.ok(entryImageService.getById(id));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<EntryImage> uploadImage(
            @RequestParam EntryType entryType,
            @RequestParam UUID entryId,
            @RequestParam MultipartFile file,
            @RequestParam(required = false) String description,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(entryImageService.uploadImage(entryType, entryId, file, description, principal.getOrganizationId(), principal.getUserId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER','SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteImage(@PathVariable UUID id) {
        try {
            entryImageService.deleteImage(id);
            return ResponseEntity.ok(Collections.singletonMap("status", "deleted"));
        } catch (ResourceNotFoundException ex) {
            // Treat deleting a non-existent image as a no-op so the API is idempotent
            return ResponseEntity.ok(Collections.singletonMap("status", "not_found"));
        } catch (ValidationException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", ex.getMessage()));
        }
    }

    @PostMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<EntryImage> lockImage(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Toggle behavior: if image is already locked, unlock it; otherwise lock it
        EntryImage current = entryImageService.getById(id);
        if (Boolean.TRUE.equals(current.getIsLocked())) {
            return ResponseEntity.ok(entryImageService.toggleLock(id, false, null, null));
        }
        return ResponseEntity.ok(entryImageService.toggleLock(id, true, principal.getUserId(), reason));
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<EntryImage> unlockImage(@PathVariable UUID id) {
        return ResponseEntity.ok(entryImageService.toggleLock(id, false, null, null));
    }
}
