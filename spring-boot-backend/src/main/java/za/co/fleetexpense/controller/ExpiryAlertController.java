package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.ExpiryAlertDTO;
import za.co.fleetexpense.entity.ExpiryAlert;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.ExpiryAlertService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expiry-alerts")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class ExpiryAlertController {

    private final ExpiryAlertService expiryAlertService;

    @GetMapping
    public ResponseEntity<List<ExpiryAlertDTO>> getAllAlerts(@AuthenticationPrincipal UserPrincipal principal) {
        // For DRIVER role in FLEET mode, only show alerts for vehicles assigned to them
        // SOLO mode and ADMIN/MANAGER roles see all organization alerts
        if (principal.getRole() == za.co.fleetexpense.entity.enums.UserRole.DRIVER && (principal.getOrganizationMode() == za.co.fleetexpense.entity.enums.OrganizationMode.BUSINESS_FLEET || principal.getOrganizationMode() == za.co.fleetexpense.entity.enums.OrganizationMode.COMPANY)) {
            return ResponseEntity.ok(expiryAlertService.getByOrganizationAndDriver(principal.getOrganizationId(), principal.getUserId()));
        }
        return ResponseEntity.ok(expiryAlertService.getByOrganization(principal.getOrganizationId()));
    }

    @GetMapping("/active")
    public ResponseEntity<List<ExpiryAlertDTO>> getActiveAlerts(@AuthenticationPrincipal UserPrincipal principal) {
        // For DRIVER role in FLEET mode, only show alerts for vehicles assigned to them
        // SOLO mode and ADMIN/MANAGER roles see all organization alerts
        if (principal.getRole() == za.co.fleetexpense.entity.enums.UserRole.DRIVER && (principal.getOrganizationMode() == za.co.fleetexpense.entity.enums.OrganizationMode.BUSINESS_FLEET || principal.getOrganizationMode() == za.co.fleetexpense.entity.enums.OrganizationMode.COMPANY)) {
            return ResponseEntity.ok(expiryAlertService.getActiveAlertsByDriver(principal.getOrganizationId(), principal.getUserId()));
        }
        return ResponseEntity.ok(expiryAlertService.getActiveAlerts(principal.getOrganizationId()));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ExpiryAlertDTO>> getAlertsByStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String status) {
        return ResponseEntity.ok(expiryAlertService.getByStatus(principal.getOrganizationId(), status));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<ExpiryAlertDTO>> getAlertsByType(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String type) {
        return ResponseEntity.ok(expiryAlertService.getByType(principal.getOrganizationId(), type));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<ExpiryAlertDTO>> getAlertsByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(expiryAlertService.getByVehicle(vehicleId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpiryAlert> getAlertById(@PathVariable UUID id) {
        return ResponseEntity.ok(expiryAlertService.getById(id));
    }

    @PostMapping("/{id}/dismiss")
    public ResponseEntity<ExpiryAlert> dismissAlert(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expiryAlertService.dismissAlert(id, principal.getUserId()));
    }

    @PostMapping("/refresh")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> refreshAlerts(@AuthenticationPrincipal UserPrincipal principal) {
        expiryAlertService.refreshAlerts(principal.getOrganizationId());
        return ResponseEntity.ok().build();
    }
}
