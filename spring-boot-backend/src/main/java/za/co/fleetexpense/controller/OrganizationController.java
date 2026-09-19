package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.UpdateOrganizationRequest;
import za.co.fleetexpense.dto.UserCreateRequest;
import za.co.fleetexpense.dto.UserUpdateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.OrganizationService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organization")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Organization> getCurrentOrganization(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(organizationService.getById(principal.getOrganizationId()));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Organization> updateOrganization(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateOrganizationRequest request) {
        return ResponseEntity.ok(organizationService.update(principal.getOrganizationId(), request));
    }

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public ResponseEntity<List<User>> getOrganizationUsers(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(organizationService.getUsersByOrganization(principal.getOrganizationId(), principal.getUserId()));
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<User> createUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(organizationService.createUser(request, principal.getOrganizationId()));
    }

    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<User> deactivateUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID userId) {
        User user = organizationService.deactivateUser(userId, principal.getOrganizationId(), principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<User> updateUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID userId,
            @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(organizationService.updateUser(userId, principal.getOrganizationId(), request, principal.getUserId(), principal.getRole()));
    }

    @PostMapping("/logo")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Organization> uploadLogo(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        String logoUrl = organizationService.uploadOrganizationLogo(principal.getOrganizationId(), file);
        return ResponseEntity.ok(organizationService.getById(principal.getOrganizationId()));
    }

    @DeleteMapping("/logo")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Organization> removeLogo(
            @AuthenticationPrincipal UserPrincipal principal) {
        organizationService.removeOrganizationLogo(principal.getOrganizationId());
        return ResponseEntity.ok(organizationService.getById(principal.getOrganizationId()));
    }
}
