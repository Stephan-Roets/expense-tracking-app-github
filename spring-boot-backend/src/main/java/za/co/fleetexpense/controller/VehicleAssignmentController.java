package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.VehicleAssignmentCreateRequest;
import za.co.fleetexpense.dto.VehicleAssignmentDTO;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.VehicleAssignmentService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicle-assignments")
@RequiredArgsConstructor
public class VehicleAssignmentController {

    private final VehicleAssignmentService assignmentService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<VehicleAssignmentDTO> createAssignment(
            @RequestBody VehicleAssignmentCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(assignmentService.createAssignment(request, currentUser));
    }

    @GetMapping
    public ResponseEntity<List<VehicleAssignmentDTO>> getAssignmentsByOrganization(
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(assignmentService.getAssignmentsByOrganization(currentUser));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<VehicleAssignmentDTO>> getAssignmentsByVehicle(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(assignmentService.getAssignmentsByVehicle(vehicleId, currentUser));
    }

    @PostMapping("/{assignmentId}/unassign")
    public ResponseEntity<VehicleAssignmentDTO> unassignVehicle(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(assignmentService.unassignVehicle(assignmentId, currentUser));
    }
}
