package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.AuthResponse;
import za.co.fleetexpense.dto.ChangePasswordRequest;
import za.co.fleetexpense.dto.LoginRequest;
import za.co.fleetexpense.dto.RegisterRequest;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.UserAssistantRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.AuthService;
import za.co.fleetexpense.service.UserService;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final UserService userService;
    private final UserAssistantRepository userAssistantRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        User user = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new ValidationException("User not found"));
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("role", user.getRole().name());
        response.put("organizationId", user.getOrganization().getId());
        response.put("organizationName", user.getOrganization().getName());
        response.put("organizationMode", user.getOrganization().getMode().name());
        response.put("passwordChanged", user.getPasswordChanged());
        response.put("profilePhotoUrl", user.getProfilePhotoUrl());
        
        // If user is an ASSISTANT, also return the specific assistant role from user_assistants
        if (user.getRole() == za.co.fleetexpense.entity.enums.UserRole.ASSISTANT) {
            userAssistantRepository.findByAssistantId(user.getId()).stream()
                .findFirst()
                .ifPresent(assistant -> response.put("assistantRole", assistant.getAssistantRole()));
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(principal.getUserId(), request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@RequestParam String token) {
        AuthResponse response = authService.verifyEmail(token);
        return ResponseEntity.ok(response);
    }
}
