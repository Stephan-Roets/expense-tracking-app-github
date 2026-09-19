package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.UserProfileCreateRequest;
import za.co.fleetexpense.dto.UserProfileDTO;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.UserProfileService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-profiles")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService profileService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDTO> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserProfileDTO profile = profileService.getProfile(currentUser.getId(), currentUser);
        if (profile == null) {
            profile = new UserProfileDTO(null, null, null, null, null, null, null, null, null, null, null, null);
        }
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileDTO> updateMyProfile(
            @RequestBody UserProfileCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Check if profile exists, if not create it (upsert behavior)
        if (profileService.getProfile(currentUser.getId(), currentUser) == null) {
            return ResponseEntity.ok(profileService.createProfile(request, currentUser));
        }
        
        return ResponseEntity.ok(profileService.updateProfile(currentUser.getId(), request, currentUser));
    }

    @PostMapping
    public ResponseEntity<UserProfileDTO> createProfile(
            @RequestBody UserProfileCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(profileService.createProfile(request, currentUser));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileDTO> getProfile(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(profileService.getProfile(userId, currentUser));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserProfileDTO> updateProfile(
            @PathVariable UUID userId,
            @RequestBody UserProfileCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(profileService.updateProfile(userId, request, currentUser));
    }
}
