package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.OdometerDriftAlert;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.OdometerDriftAlertService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/alerts/odometer-drift")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class OdometerDriftAlertController {

    private final OdometerDriftAlertService odometerDriftAlertService;

    @GetMapping
    public ResponseEntity<List<OdometerDriftAlert>> getAlerts(@AuthenticationPrincipal UserPrincipal principal) {
        List<OdometerDriftAlert> alerts = odometerDriftAlertService.getActiveAlerts(principal.getOrganizationId());
        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/check-all")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Map<String, Integer>> checkAllVehicles(@AuthenticationPrincipal UserPrincipal principal) {
        int alertsCreated = odometerDriftAlertService.checkAllVehiclesInOrganization(principal.getOrganizationId());
        Map<String, Integer> response = new java.util.HashMap<>();
        response.put("alertsCreated", alertsCreated);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{vehicleId}/dismiss")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<OdometerDriftAlert> dismissAlert(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        OdometerDriftAlert alert = odometerDriftAlertService.dismissAlert(vehicleId, principal.getUserId());
        return ResponseEntity.ok(alert);
    }

    @DeleteMapping("/{vehicleId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteAlert(@PathVariable UUID vehicleId) {
        odometerDriftAlertService.deleteAlert(vehicleId);
        return ResponseEntity.noContent().build();
    }
}
