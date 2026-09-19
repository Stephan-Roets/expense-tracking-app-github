package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.TyreRotationHistory;
import za.co.fleetexpense.entity.TyreRotationTracking;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.TyreRotationService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tyre-rotations")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class TyreRotationController {

    private final TyreRotationService tyreRotationService;

    @GetMapping("/tracking")
    public ResponseEntity<List<TyreRotationTracking>> getAllTracking(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tyreRotationService.getAllTracking(principal.getOrganizationId()));
    }

    @GetMapping("/tracking/vehicle/{vehicleId}")
    public ResponseEntity<List<TyreRotationTracking>> getTrackingByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(tyreRotationService.getTrackingByVehicle(vehicleId));
    }

    @GetMapping("/tracking/active")
    public ResponseEntity<List<TyreRotationTracking>> getActiveTracking(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tyreRotationService.getActiveTracking(principal.getOrganizationId()));
    }

    @GetMapping("/tracking/{id}")
    public ResponseEntity<TyreRotationTracking> getTrackingById(@PathVariable UUID id) {
        return ResponseEntity.ok(tyreRotationService.getTrackingById(id));
    }

    @PostMapping("/tracking")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<TyreRotationTracking> createTracking(
            @RequestBody TyreRotationTracking tracking,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tyreRotationService.createTracking(tracking, principal.getOrganizationId()));
    }

    @PutMapping("/tracking/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<TyreRotationTracking> updateTracking(
            @PathVariable UUID id,
            @RequestBody TyreRotationTracking tracking) {
        return ResponseEntity.ok(tyreRotationService.updateTracking(id, tracking));
    }

    @DeleteMapping("/tracking/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteTracking(@PathVariable UUID id) {
        tyreRotationService.deleteTracking(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tracking/{id}/dismiss")
    public ResponseEntity<TyreRotationTracking> dismissTracking(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tyreRotationService.dismissTracking(id, principal.getUserId()));
    }

    @GetMapping("/history/tracking/{trackingId}")
    public ResponseEntity<List<TyreRotationHistory>> getHistoryByTracking(@PathVariable UUID trackingId) {
        return ResponseEntity.ok(tyreRotationService.getHistoryByTracking(trackingId));
    }

    @PostMapping("/history")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<TyreRotationHistory> recordRotation(@RequestBody TyreRotationHistory history) {
        return ResponseEntity.ok(tyreRotationService.recordRotation(history));
    }
}
