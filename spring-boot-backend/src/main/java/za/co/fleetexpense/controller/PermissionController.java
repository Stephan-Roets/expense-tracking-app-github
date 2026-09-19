package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.Permission;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.PermissionService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    /**
     * Get permission matrix for the organization (SUPER_ADMIN only)
     */
    @GetMapping("/matrix")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Map<String, Map<String, Boolean>>>> getPermissionMatrix(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(permissionService.getPermissionMatrix(principal.getOrganizationId()));
    }

    /**
     * Get all permission overrides for the organization
     */
    @GetMapping
    public ResponseEntity<List<Permission>> getOverrides(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(permissionService.getOverridesForOrganization(principal.getOrganizationId()));
    }

    /**
     * Set or update a permission override (SUPER_ADMIN only)
     */
    @PostMapping("/override")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Permission> setOverride(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody PermissionOverrideRequest request) {
        Permission permission = permissionService.setOverride(
                principal.getOrganizationId(),
                request.getPermissionType(),
                request.getPermissionKey(),
                request.getUserRole(),
                request.isAllowed()
        );
        return ResponseEntity.ok(permission);
    }

    /**
     * Delete a permission override (reset to default) (SUPER_ADMIN only)
     */
    @DeleteMapping("/override")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteOverride(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String permissionType,
            @RequestParam String permissionKey,
            @RequestParam String userRole) {
        permissionService.deleteOverride(
                principal.getOrganizationId(),
                permissionType,
                permissionKey,
                userRole
        );
        return ResponseEntity.ok().build();
    }

    /**
     * Reset all permission overrides for the organization (SUPER_ADMIN only)
     */
    @PostMapping("/reset")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> resetAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        permissionService.resetAllForOrganization(principal.getOrganizationId());
        return ResponseEntity.ok().build();
    }

    /**
     * DTO for permission override requests
     */
    public static class PermissionOverrideRequest {
        private String permissionType;
        private String permissionKey;
        private String userRole;
        private boolean isAllowed;

        public String getPermissionType() {
            return permissionType;
        }

        public void setPermissionType(String permissionType) {
            this.permissionType = permissionType;
        }

        public String getPermissionKey() {
            return permissionKey;
        }

        public void setPermissionKey(String permissionKey) {
            this.permissionKey = permissionKey;
        }

        public String getUserRole() {
            return userRole;
        }

        public void setUserRole(String userRole) {
            this.userRole = userRole;
        }

        public boolean isAllowed() {
            return isAllowed;
        }

        public void setIsAllowed(boolean allowed) {
            isAllowed = allowed;
        }
    }
}
