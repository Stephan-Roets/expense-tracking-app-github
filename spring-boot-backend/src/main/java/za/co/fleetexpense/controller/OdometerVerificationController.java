package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.enums.OdometerReadingType;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.OdometerVerificationService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/odometer-verifications")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class OdometerVerificationController {

    private final OdometerVerificationService odometerVerificationService;

    @GetMapping
    public ResponseEntity<List<OdometerVerification>> getAllVerifications(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(odometerVerificationService.getByOrganization(principal.getOrganizationId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OdometerVerification> getVerificationById(@PathVariable UUID id) {
        return ResponseEntity.ok(odometerVerificationService.getById(id));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<OdometerVerification>> getVerificationsByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(odometerVerificationService.getByVehicle(vehicleId));
    }

    @GetMapping("/vehicle/{vehicleId}/tax-year/{taxYear}")
    public ResponseEntity<List<OdometerVerification>> getVerificationsByVehicleAndTaxYear(
            @PathVariable UUID vehicleId,
            @PathVariable Integer taxYear) {
        return ResponseEntity.ok(odometerVerificationService.getByVehicleAndTaxYear(vehicleId, taxYear));
    }

    @GetMapping("/vehicle/{vehicleId}/tax-year/{taxYear}/type/{type}")
    public ResponseEntity<OdometerVerification> getVerificationByVehicleYearAndType(
            @PathVariable UUID vehicleId,
            @PathVariable Integer taxYear,
            @PathVariable OdometerReadingType type) {
        return ResponseEntity.ok(odometerVerificationService.getByVehicleYearAndType(vehicleId, taxYear, type));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<OdometerVerification> createVerification(
            @RequestBody OdometerVerification verification,
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID vehicleId = verification.getVehicle() != null ? verification.getVehicle().getId() : null;
        return ResponseEntity.ok(odometerVerificationService.create(verification, vehicleId, principal.getOrganizationId(), principal.getUserId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<OdometerVerification> updateVerification(
            @PathVariable UUID id,
            @RequestBody OdometerVerification verification,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(odometerVerificationService.update(id, verification, principal.getUserId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteVerification(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        odometerVerificationService.delete(id, principal.getUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<OdometerLockDTO> lockVerification(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        OdometerVerification v = odometerVerificationService.toggleLock(id, true, principal.getUserId(), reason);
        return ResponseEntity.ok(toLockDto(v));
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<OdometerLockDTO> unlockVerification(@PathVariable UUID id) {
        OdometerVerification v = odometerVerificationService.toggleLock(id, false, null, null);
        return ResponseEntity.ok(toLockDto(v));
    }

    private OdometerLockDTO toLockDto(OdometerVerification v) {
        String lockedByName = null;
        if (v.getLockedByUser() != null) {
            var u = v.getLockedByUser();
            String first = u.getFirstName() != null ? u.getFirstName() : "";
            String last = u.getLastName() != null ? u.getLastName() : "";
            lockedByName = (first + " " + last).trim();
        }
        return new OdometerLockDTO(
                v.getId(),
                v.getIsLocked(),
                v.getLockedAt(),
                lockedByName,
                v.getLockedReason()
        );
    }

    public record OdometerLockDTO(
            UUID id,
            Boolean isLocked,
            OffsetDateTime lockedAt,
            String lockedByName,
            String lockedReason
    ) {}
}
