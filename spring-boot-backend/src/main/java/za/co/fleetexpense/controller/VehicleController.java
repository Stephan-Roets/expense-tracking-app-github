package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.FleetAssignmentHistoryDTO;
import za.co.fleetexpense.dto.FleetOdometerStatusDTO;
import za.co.fleetexpense.dto.VehicleCreateRequest;
import za.co.fleetexpense.dto.VehicleDTO;
import za.co.fleetexpense.dto.VehicleUpdateRequest;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.enums.EntryType;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.exception.ForbiddenException;
import za.co.fleetexpense.repository.EntryImageRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.PermissionService;
import za.co.fleetexpense.service.VehicleFuelConsumptionStatsService;
import za.co.fleetexpense.service.VehicleService;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicles")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;
    private final VehicleFuelConsumptionStatsService fuelStatsService;
    private final EntryImageRepository entryImageRepository;
    private final PermissionService permissionService;

    // ==================== CRUD OPERATIONS ====================

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<VehicleDTO>> getAllVehicles(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.getAllByOrganization(principal.getOrganizationId(), principal.getUserId(), principal.getRole()));
    }

    @GetMapping("/rejected")
    @Transactional(readOnly = true)
    public ResponseEntity<List<VehicleDTO>> getRejectedVehicles(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.getRejectedVehicles(principal.getOrganizationId(), principal.getRole()));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<VehicleDTO> getVehicleById(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.getById(id, principal.getUserId(), principal.getRole()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> createVehicle(
            @Valid @RequestBody VehicleCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        VehicleDTO created = vehicleService.create(request, principal.getOrganizationId(), principal.getUserId(), principal.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> updateVehicle(
            @PathVariable UUID id,
            @Valid @RequestBody VehicleUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.update(id, request, principal.getOrganizationId(), principal.getUserId(), principal.getRole()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteVehicle(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        vehicleService.delete(id, principal.getOrganizationId(), principal.getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> lockVehicle(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.toggleLock(id, true, principal.getUserId(), reason));
    }

    @PatchMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> lockVehiclePatch(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.toggleLock(id, true, principal.getUserId(), reason));
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> unlockVehicle(@PathVariable UUID id) {
        return ResponseEntity.ok(vehicleService.toggleLock(id, false, null, null));
    }

    @PatchMapping("/{id}/unlock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> unlockVehiclePatch(@PathVariable UUID id) {
        return ResponseEntity.ok(vehicleService.toggleLock(id, false, null, null));
    }

    @PostMapping("/{id}/assign-driver")
    public ResponseEntity<VehicleDTO> assignDriver(
            @PathVariable UUID id,
            @RequestParam UUID driverId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.assignDriver(id, driverId, principal.getOrganizationId(), principal.getRole()));
    }

    @PostMapping("/{id}/unassign-driver")
    public ResponseEntity<VehicleDTO> unassignDriver(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.unassignDriver(id, principal.getOrganizationId(), principal.getRole()));
    }

    @PatchMapping("/{id}/odometer")
    public ResponseEntity<VehicleDTO> updateOdometer(
            @PathVariable UUID id,
            @RequestParam Integer odometerReading,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.updateOdometer(id, odometerReading));
    }

    @PostMapping("/{id}/recalculate-odometer")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> recalculateOdometer(@PathVariable UUID id) {
        return ResponseEntity.ok(vehicleService.recalculateCurrentOdometer(id));
    }

    // ==================== VEHICLE IMAGES ====================

    @GetMapping("/{vehicleId}/images")
    @Transactional(readOnly = true)
    public ResponseEntity<List<EntryImage>> getVehicleImages(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(entryImageRepository.findByEntry(EntryType.VEHICLE, vehicleId));
    }

    // ==================== ADMIN APPROVAL ENDPOINTS ====================

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<VehicleDTO>> getPendingVehicles(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.getPendingVehicles(principal.getOrganizationId()));
    }

    @PostMapping("/{id}/approve-creation")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> approveVehicleCreation(@PathVariable UUID id) {
        return ResponseEntity.ok(vehicleService.approveVehicleCreation(id));
    }

    @PostMapping("/{id}/reject-creation")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> rejectVehicleCreation(
            @PathVariable UUID id,
            @RequestParam(required = false) String rejectionReason,
            @AuthenticationPrincipal UserPrincipal principal) {
        vehicleService.rejectVehicleCreation(id, rejectionReason, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/approve-deletion")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> approveVehicleDeletion(@PathVariable UUID id) {
        vehicleService.approveVehicleDeletion(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reject-deletion")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<VehicleDTO> rejectVehicleDeletion(
            @PathVariable UUID id,
            @RequestParam(required = false) String rejectionReason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(vehicleService.rejectVehicleDeletion(id, rejectionReason, principal.getUserId()));
    }

    // ==================== FUEL STATS ====================

    // ==================== FLEET ODOMETER STATUS ====================

    @GetMapping("/fleet/odometer-status")
    @Transactional(readOnly = true)
    public ResponseEntity<List<FleetOdometerStatusDTO>> getFleetOdometerStatus(@AuthenticationPrincipal UserPrincipal principal) {
        // Gate 1: Fleet mode only (SOLO excluded)
        if (principal.getOrganizationMode() != OrganizationMode.FLEET) {
            throw new ForbiddenException("Fleet-wide odometer status is only available in fleet mode");
        }

        // Gate 2: Granular permission check (server-side authoritative)
        boolean hasPermission = permissionService.isAllowed(
            principal.getOrganizationId(),
            "FLEET_STATUS",
            "VIEW_FLEET_STATUS",
            principal.getRole().name()
        );

        if (!hasPermission) {
            throw new ForbiddenException("Missing VIEW_FLEET_STATUS permission");
        }

        return ResponseEntity.ok(vehicleService.getFleetOdometerStatus(principal.getOrganizationId()));
    }

    // ==================== FLEET ASSIGNMENT HISTORY ====================

    @GetMapping("/fleet/assignment-history")
    @Transactional(readOnly = true)
    public ResponseEntity<List<FleetAssignmentHistoryDTO>> getFleetAssignmentHistory(
            @RequestParam(required = false, defaultValue = "false") boolean includeConditionReports,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Gate 1: Fleet mode only (SOLO excluded)
        if (principal.getOrganizationMode() != OrganizationMode.FLEET) {
            throw new ForbiddenException("Fleet assignment history is only available in fleet mode");
        }

        // Gate 2: Granular permission check (server-side authoritative)
        boolean hasPermission = permissionService.isAllowed(
            principal.getOrganizationId(),
            "FLEET_STATUS",
            "VIEW_FLEET_STATUS",
            principal.getRole().name()
        );

        if (!hasPermission) {
            throw new ForbiddenException("Missing VIEW_FLEET_STATUS permission");
        }

        return ResponseEntity.ok(vehicleService.getFleetAssignmentHistory(principal.getOrganizationId(), includeConditionReports));
    }
}
