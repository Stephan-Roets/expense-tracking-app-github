package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.enums.OdometerReadingType;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.OdometerVerificationService;
import za.co.fleetexpense.service.StorageService;

import java.util.List;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Compliance Controller - Handles SARS logbook compliance endpoints
 */
@RestController
@RequestMapping("/api/v1/compliance")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class ComplianceController {

    private final OdometerVerificationService odometerVerificationService;
    private final OdometerVerificationRepository odometerVerificationRepository;
    private final StorageService storageService;

    private String toAbsoluteUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(url)
                .toUriString();
    }

    /**
     * Create odometer verification with optional photo
     * Used during onboarding and tax year opening/closing
     */
    @PostMapping(value = "/odometer", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<OdometerVerification> createOdometerVerification(
            @RequestParam("vehicleId") UUID vehicleId,
            @RequestParam("readingType") OdometerReadingType readingType,
            @RequestParam("odometerValue") Integer odometerValue,
            @RequestParam("taxYear") Integer taxYear,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            @RequestParam(value = "gpsLatitude", required = false) BigDecimal gpsLatitude,
            @RequestParam(value = "gpsLongitude", required = false) BigDecimal gpsLongitude,
            @RequestParam(value = "gpsAccuracy", required = false) BigDecimal gpsAccuracy,
            @AuthenticationPrincipal UserPrincipal principal) {

        // Upload photo if provided
        String imageUrl = null;
        String imageKey = null;
        if (photo != null && !photo.isEmpty()) {
            var uploadResult = storageService.uploadFile(photo, "odometer-readings-for-tax-readiness-audit", principal.getUserId());
            imageUrl = uploadResult.getUrl();
            imageKey = uploadResult.getKey();
        }

        // Create verification
        OdometerVerification verification = OdometerVerification.builder()
                .vehicle(null) // Will be set by service
                .taxYear(taxYear)
                .readingType(readingType)
                .odometerValue(odometerValue)
                .imageUrlAvif(imageUrl)
                .imageKey(imageKey)
                .capturedAt(OffsetDateTime.now())
                .gpsLatitude(gpsLatitude)
                .gpsLongitude(gpsLongitude)
                .gpsAccuracyMeters(gpsAccuracy)
                .isLocked(false)
                .build();

        OdometerVerification saved = odometerVerificationService.create(
                verification,
                vehicleId,
                principal.getOrganizationId(),
                principal.getUserId()
        );

        return ResponseEntity.ok(saved);
    }

    /**
     * Get odometer verification status for a vehicle
     */
    @GetMapping("/odometer/status/{vehicleId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<OdometerStatusDTO>> getOdometerStatus(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<OdometerVerification> verifications = odometerVerificationRepository.findByVehicleId(vehicleId);
        List<OdometerStatusDTO> dtos = verifications.stream()
                .map(v -> new OdometerStatusDTO(
                        v.getId(),
                        v.getTaxYear(),
                        v.getReadingType(),
                        v.getOdometerValue(),
                        v.getCapturedAt(),
                        toAbsoluteUrl(v.getImageUrlAvif()),
                        v.getGpsLatitude(),
                        v.getGpsLongitude(),
                        v.getGpsAccuracyMeters(),
                        v.getIsLocked()
                ))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Simple DTO for odometer status response
     */
    public record OdometerStatusDTO(
            UUID id,
            Integer taxYear,
            OdometerReadingType readingType,
            Integer odometerValue,
            OffsetDateTime capturedAt,
            String imageUrlAvif,
            BigDecimal gpsLatitude,
            BigDecimal gpsLongitude,
            BigDecimal gpsAccuracyMeters,
            Boolean isLocked
    ) {}

    @GetMapping("/odometer")
    @Transactional(readOnly = true)
    public ResponseEntity<List<OdometerVerificationListDTO>> listOdometerVerifications(
            @RequestParam("taxYear") Integer taxYear,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<OdometerVerification> verifications =
                odometerVerificationRepository.findByOrganizationId(principal.getOrganizationId());

        List<OdometerVerificationListDTO> dtos = verifications.stream()
                .filter(v -> v.getTaxYear() != null && v.getTaxYear().equals(taxYear))
                .map(v -> {
                    String lockedByName = null;
                    if (v.getLockedByUser() != null) {
                        var u = v.getLockedByUser();
                        String first = u.getFirstName() != null ? u.getFirstName() : "";
                        String last = u.getLastName() != null ? u.getLastName() : "";
                        lockedByName = (first + " " + last).trim();
                    }

                    return new OdometerVerificationListDTO(
                            v.getId(),
                            v.getVehicle() != null ? v.getVehicle().getId() : null,
                            v.getVehicle() != null ? v.getVehicle().getRegistrationNumber() : null,
                            v.getTaxYear(),
                            v.getReadingType(),
                            v.getOdometerValue(),
                            toAbsoluteUrl(v.getImageUrlAvif()),
                            v.getCapturedAt(),
                            v.getIsLocked(),
                            v.getLockedAt(),
                            lockedByName,
                            v.getLockedReason()
                    );
                })
                .toList();

        return ResponseEntity.ok(dtos);
    }

    @PostMapping(value = "/odometer/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','DRIVER')")
    @Transactional
    public ResponseEntity<OdometerVerificationListDTO> updateOdometerPhoto(
            @PathVariable UUID id,
            @RequestParam("photo") MultipartFile photo,
            @AuthenticationPrincipal UserPrincipal principal) {

        OdometerVerification verification = odometerVerificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Odometer verification not found: " + id));

        if (verification.getOrganization() != null
                && !verification.getOrganization().getId().equals(principal.getOrganizationId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cannot modify verification from another organization");
        }

        // Best-effort delete of previous file
        try {
            if (verification.getImageKey() != null && !verification.getImageKey().isBlank()) {
                storageService.deleteFile("odometer-readings-for-tax-readiness-audit", verification.getImageKey());
            }
        } catch (RuntimeException ignored) {
        }

        var uploadResult = storageService.uploadFile(photo, "odometer-readings-for-tax-readiness-audit", principal.getUserId());
        verification.setImageUrlAvif(uploadResult.getUrl());
        verification.setImageKey(uploadResult.getKey());

        OdometerVerification saved = odometerVerificationRepository.save(verification);

        String lockedByName = null;
        if (saved.getLockedByUser() != null) {
            var u = saved.getLockedByUser();
            String first = u.getFirstName() != null ? u.getFirstName() : "";
            String last = u.getLastName() != null ? u.getLastName() : "";
            lockedByName = (first + " " + last).trim();
        }

        OdometerVerificationListDTO dto = new OdometerVerificationListDTO(
                saved.getId(),
                saved.getVehicle() != null ? saved.getVehicle().getId() : null,
                saved.getVehicle() != null ? saved.getVehicle().getRegistrationNumber() : null,
                saved.getTaxYear(),
                saved.getReadingType(),
                saved.getOdometerValue(),
                toAbsoluteUrl(saved.getImageUrlAvif()),
                saved.getCapturedAt(),
                saved.getIsLocked(),
                saved.getLockedAt(),
                lockedByName,
                saved.getLockedReason()
        );

        return ResponseEntity.ok(dto);
    }

    @PatchMapping("/odometer/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','DRIVER')")
    @Transactional
    public ResponseEntity<OdometerVerificationListDTO> updateOdometerDetails(
            @PathVariable UUID id,
            @RequestBody UpdateOdometerRequest body,
            @AuthenticationPrincipal UserPrincipal principal) {

        OdometerVerification verification = odometerVerificationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Odometer verification not found: " + id));

        if (verification.getOrganization() != null
                && !verification.getOrganization().getId().equals(principal.getOrganizationId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cannot modify verification from another organization");
        }

        if (Boolean.TRUE.equals(verification.getIsLocked())) {
            throw new ValidationException("Cannot modify locked odometer verification");
        }

        if (body.odometerValue() != null) {
            verification.setOdometerValue(body.odometerValue());
        }
        if (body.capturedAt() != null) {
            verification.setCapturedAt(body.capturedAt());
        }

        OdometerVerification saved = odometerVerificationRepository.save(verification);

        String lockedByName = null;
        if (saved.getLockedByUser() != null) {
            var u = saved.getLockedByUser();
            String first = u.getFirstName() != null ? u.getFirstName() : "";
            String last = u.getLastName() != null ? u.getLastName() : "";
            lockedByName = (first + " " + last).trim();
        }

        OdometerVerificationListDTO dto = new OdometerVerificationListDTO(
                saved.getId(),
                saved.getVehicle() != null ? saved.getVehicle().getId() : null,
                saved.getVehicle() != null ? saved.getVehicle().getRegistrationNumber() : null,
                saved.getTaxYear(),
                saved.getReadingType(),
                saved.getOdometerValue(),
                toAbsoluteUrl(saved.getImageUrlAvif()),
                saved.getCapturedAt(),
                saved.getIsLocked(),
                saved.getLockedAt(),
                lockedByName,
                saved.getLockedReason()
        );

        return ResponseEntity.ok(dto);
    }

    public record OdometerVerificationListDTO(
            UUID id,
            UUID vehicleId,
            String vehicleReg,
            Integer taxYear,
            OdometerReadingType readingType,
            Integer odometerValue,
            String imageUrl,
            OffsetDateTime capturedAt,
            Boolean isLocked,
            OffsetDateTime lockedAt,
            String lockedByName,
            String lockedReason
    ) {}

    public record UpdateOdometerRequest(
            Integer odometerValue,
            OffsetDateTime capturedAt
    ) {}
}
