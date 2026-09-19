package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.ChangePasswordRequest;
import za.co.fleetexpense.dto.UpdateProfileRequest;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.UserService;
import za.co.fleetexpense.service.StorageService;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final StorageService storageService;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.getById(principal.getUserId()));
    }

    @PutMapping("/me")
    public ResponseEntity<User> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(principal.getUserId(), request));
    }

    @PostMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.getUserId(), request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal UserPrincipal principal) {
        userService.deactivateUser(principal.getUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/profile-photo")
    public ResponseEntity<User> uploadProfilePhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        String photoUrl = userService.uploadProfilePhoto(principal.getUserId(), file);
        return ResponseEntity.ok(userService.getById(principal.getUserId()));
    }

    @DeleteMapping("/profile-photo")
    public ResponseEntity<User> removeProfilePhoto(@AuthenticationPrincipal UserPrincipal principal) {
        userService.removeProfilePhoto(principal.getUserId());
        return ResponseEntity.ok(userService.getById(principal.getUserId()));
    }
}
