package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.VehicleHandoffDTO;
import za.co.fleetexpense.dto.VehicleHandoffInitiateRequest;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.VehicleHandoffService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/handoffs")
@RequiredArgsConstructor
public class VehicleHandoffController {

    private final VehicleHandoffService handoffService;

    @PostMapping("/initiate")
    public ResponseEntity<VehicleHandoffDTO> initiateHandoff(
            @Valid @RequestBody VehicleHandoffInitiateRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(handoffService.initiateHandoff(dto.vehicleId(), dto.newDriverId(), principal.getUserId()));
    }

    @PostMapping("/{id}/advance")
    public ResponseEntity<VehicleHandoffDTO> advanceHandoff(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(handoffService.advanceHandoff(id, principal.getUserId()));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelHandoff(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        handoffService.cancelHandoff(id, reason, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/force-complete")
    public ResponseEntity<VehicleHandoffDTO> forceCompleteHandoff(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(handoffService.forceCompleteHandoff(id, reason, principal.getUserId()));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<VehicleHandoffDTO> getActiveHandoffByVehicle(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(handoffService.getActiveHandoffByVehicle(vehicleId, principal.getUserId()));
    }

    @GetMapping
    public ResponseEntity<List<VehicleHandoffDTO>> getOrganizationHandoffs(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(handoffService.getHandoffsByOrganization(principal.getOrganizationId()));
    }
}
