package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.UserAssistantDTO;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.UserAssistant;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.AssistantService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j

@RestController
@RequestMapping("/api/v1/assistants")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<UserAssistantDTO> addAssistant(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody AddAssistantRequest request
    ) {
        // Only individual account owners (SOLO mode) can add assistants
        if (currentUser == null || currentUser.getOrganizationMode() != za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            log.warn("Access denied - user must be in SOLO mode to add assistants");
            return ResponseEntity.badRequest().build();
        }

        UserAssistant userAssistant = assistantService.addAssistant(
            currentUser.getUserId(),
            request.getAssistantEmail(),
            request.getAssistantFirstName(),
            request.getAssistantLastName(),
            request.getAssistantRole(),
            request.getDateRangeStart(),
            request.getDateRangeEnd(),
            request.getAssignedVehicleId(),
            request.getPassword()
        );

        return ResponseEntity.ok(toDTO(userAssistant));
    }

    @PutMapping("/{assistantId}")
    public ResponseEntity<UserAssistantDTO> updateAssistant(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable UUID assistantId,
            @RequestBody UpdateAssistantRequest request
    ) {
        // Only individual account owners (SOLO mode) can update assistants
        if (currentUser == null || currentUser.getOrganizationMode() != za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            log.warn("Access denied - user must be in SOLO mode to update assistants");
            return ResponseEntity.badRequest().build();
        }

        UserAssistant userAssistant = assistantService.updateAssistant(
            currentUser.getUserId(),
            assistantId,
            request.getAssistantRole(),
            request.getDateRangeStart(),
            request.getDateRangeEnd(),
            request.getAssignedVehicleId(),
            request.getIsActive()
        );

        return ResponseEntity.ok(toDTO(userAssistant));
    }

    @DeleteMapping("/{assistantId}")
    public ResponseEntity<Void> removeAssistant(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @PathVariable UUID assistantId
    ) {
        // Only individual account owners (SOLO mode) can remove assistants
        if (currentUser == null || currentUser.getOrganizationMode() != za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            log.warn("Access denied - user must be in SOLO mode to remove assistants");
            return ResponseEntity.badRequest().build();
        }

        assistantService.removeAssistant(currentUser.getUserId(), assistantId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<UserAssistantDTO>> getAssistants(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        log.info("getAssistants called - currentUser: {}, organizationMode: {}", 
            currentUser != null ? currentUser.getEmail() : "null",
            currentUser != null ? currentUser.getOrganizationMode() : "null");
        
        // Only individual account owners (SOLO mode) can view their assistants
        if (currentUser == null || currentUser.getOrganizationMode() != za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            log.warn("Access denied - user must be in SOLO mode to view assistants");
            return ResponseEntity.badRequest().build();
        }

        List<UserAssistant> assistants = assistantService.getAssistantsForOwner(currentUser.getUserId());
        return ResponseEntity.ok(assistants.stream().map(this::toDTO).collect(Collectors.toList()));
    }


    private UserAssistantDTO toDTO(UserAssistant userAssistant) {
        // Fetch assistant user details to get name and email
        User assistant = userRepository.findById(userAssistant.getAssistantId()).orElse(null);
        
        // Fetch vehicle registration if vehicle is assigned
        String vehicleRegistration = null;
        if (userAssistant.getAssignedVehicleId() != null) {
            // Note: Would need VehicleRepository to fetch this, but for now we'll leave it null
            // The frontend already handles missing vehicle registration gracefully
        }
        
        return UserAssistantDTO.builder()
            .id(userAssistant.getId())
            .ownerId(userAssistant.getOwnerId())
            .assistantId(userAssistant.getAssistantId())
            .assistantEmail(assistant != null ? assistant.getEmail() : null)
            .assistantFirstName(assistant != null ? assistant.getFirstName() : null)
            .assistantLastName(assistant != null ? assistant.getLastName() : null)
            .assistantRole(userAssistant.getAssistantRole())
            .assignedDateRangeStart(userAssistant.getAssignedDateRangeStart())
            .assignedDateRangeEnd(userAssistant.getAssignedDateRangeEnd())
            .assignedVehicleId(userAssistant.getAssignedVehicleId())
            .assignedVehicleRegistration(vehicleRegistration)
            .isActive(userAssistant.getIsActive())
            .removedAt(userAssistant.getRemovedAt())
            .removedBy(userAssistant.getRemovedBy())
            .createdAt(userAssistant.getCreatedAt())
            .updatedAt(userAssistant.getUpdatedAt())
            .build();
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class AddAssistantRequest {
        private String assistantEmail;
        private String assistantFirstName;
        private String assistantLastName;
        private String assistantRole;
        private LocalDate dateRangeStart;
        private LocalDate dateRangeEnd;
        private UUID assignedVehicleId;
        private String password;
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class UpdateAssistantRequest {
        private String assistantRole;
        private LocalDate dateRangeStart;
        private LocalDate dateRangeEnd;
        private UUID assignedVehicleId;
        private Boolean isActive;
    }
}
