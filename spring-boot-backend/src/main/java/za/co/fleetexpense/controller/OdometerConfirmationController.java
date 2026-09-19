package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.OdometerConfirmationCreateRequest;
import za.co.fleetexpense.dto.OdometerConfirmationDTO;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.OdometerConfirmationService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/odometer-confirmations")
@RequiredArgsConstructor
public class OdometerConfirmationController {

    private final OdometerConfirmationService confirmationService;
    private final UserRepository userRepository;

    @PostMapping("/assignment/{assignmentId}")
    public ResponseEntity<OdometerConfirmationDTO> createConfirmation(
            @PathVariable UUID assignmentId,
            @RequestBody OdometerConfirmationCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(confirmationService.createConfirmation(assignmentId, request, currentUser));
    }

    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<OdometerConfirmationDTO> getConfirmation(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        OdometerConfirmationDTO confirmation = confirmationService.getConfirmationOrNull(assignmentId, currentUser);
        if (confirmation == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(confirmation);
    }

    @PostMapping(value = "/{confirmationId}/image", consumes = "multipart/form-data")
    public ResponseEntity<OdometerConfirmationDTO> uploadImage(
            @PathVariable UUID confirmationId,
            @RequestParam MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(confirmationService.uploadImage(confirmationId, file, currentUser));
    }

    @PutMapping("/{confirmationId}")
    public ResponseEntity<OdometerConfirmationDTO> updateConfirmation(
            @PathVariable UUID confirmationId,
            @RequestBody OdometerConfirmationCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(confirmationService.updateConfirmation(confirmationId, request, currentUser));
    }
}
