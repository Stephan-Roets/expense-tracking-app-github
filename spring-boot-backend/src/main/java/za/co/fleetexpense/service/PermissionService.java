package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.Permission;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.repository.PermissionRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionService {

    private final PermissionRepository permissionRepository;

    // ─── EXPENSE CATEGORIES ───
    // Default: DRIVER sees FUEL_LOG, MAINTENANCE_TOPUP, CAR_WASH
    // Default: MANAGER/ADMIN see everything
    // Default: RENTAL_CUSTOMER sees FUEL_LOG, MAINTENANCE_TOPUP, CAR_WASH
    private static final Map<String, Set<String>> EXPENSE_CATEGORY_DEFAULTS = Map.ofEntries(
            Map.entry("FUEL_LOG", Set.of("DRIVER", "MANAGER", "ADMIN", "RENTAL_CUSTOMER")),
            Map.entry("MECHANIC_SERVICE", Set.of("MANAGER", "ADMIN")),
            Map.entry("MAINTENANCE_TOPUP", Set.of("DRIVER", "MANAGER", "ADMIN", "RENTAL_CUSTOMER")),
            Map.entry("TIRES", Set.of("MANAGER", "ADMIN")),
            Map.entry("CAR_WASH", Set.of("DRIVER", "MANAGER", "ADMIN", "RENTAL_CUSTOMER")),
            Map.entry("INSURANCE_PREMIUM", Set.of("MANAGER", "ADMIN")),
            Map.entry("VEHICLE_TRACKING", Set.of("MANAGER", "ADMIN")),
            Map.entry("ETOLL_SANRAL", Set.of("MANAGER", "ADMIN")),
            Map.entry("LICENSE_RENEWAL", Set.of("MANAGER", "ADMIN")),
            Map.entry("PERSONAL_LICENSE", Set.of("MANAGER", "ADMIN")),
            Map.entry("ROADWORTHY", Set.of("MANAGER", "ADMIN")),
            Map.entry("OTHER_FIXED", Set.of("MANAGER", "ADMIN"))
    );

    // ─── VEHICLE ASSIGNMENTS ───
    private static final Map<String, Set<String>> VEHICLE_ASSIGNMENT_DEFAULTS = Map.ofEntries(
            Map.entry("ASSIGN_TO_DRIVER", Set.of("MANAGER", "ADMIN")),
            Map.entry("ASSIGN_TO_MANAGER", Set.of("ADMIN")),
            Map.entry("RECLAIM_VEHICLE", Set.of("MANAGER", "ADMIN")),
            Map.entry("VIEW_ASSIGNMENTS", Set.of("MANAGER", "ADMIN"))
    );

    // ─── LOGBOOK ───
    private static final Map<String, Set<String>> LOGBOOK_DEFAULTS = Map.ofEntries(
            Map.entry("VIEW_OWN_LOGBOOK", Set.of("DRIVER", "ASSISTANT_HIGH", "MANAGER", "ADMIN", "RENTAL_CUSTOMER")),
            Map.entry("VIEW_ALL_LOGBOOKS", Set.of("MANAGER", "ADMIN")),
            Map.entry("EDIT_OWN_ENTRIES", Set.of("DRIVER", "ASSISTANT_HIGH", "MANAGER", "ADMIN")),
            Map.entry("EDIT_ALL_ENTRIES", Set.of("ADMIN")),
            Map.entry("DELETE_OWN_ENTRIES", Set.of("DRIVER", "ASSISTANT_HIGH", "MANAGER", "ADMIN")),
            Map.entry("DELETE_ALL_ENTRIES", Set.of("ADMIN"))
    );

    // ─── TAX AUDIT ───
    private static final Map<String, Set<String>> TAX_AUDIT_DEFAULTS = Map.ofEntries(
            Map.entry("ADD_OPENING_READING", Set.of("SOLO", "ASSISTANT_HIGH", "MANAGER", "ADMIN")),
            Map.entry("ADD_CLOSING_READING", Set.of("SOLO", "ASSISTANT_HIGH", "MANAGER", "ADMIN")),
            Map.entry("EDIT_READINGS", Set.of("SOLO", "ASSISTANT_HIGH", "ADMIN")),
            Map.entry("DELETE_READINGS", Set.of("SOLO", "ASSISTANT_HIGH", "ADMIN")),
            Map.entry("VIEW_TAX_REPORTS", Set.of("SOLO", "ASSISTANT_HIGH", "MANAGER", "ADMIN"))
    );

    // ─── EXPORT ───
    private static final Map<String, Set<String>> EXPORT_DEFAULTS = Map.ofEntries(
            Map.entry("EXPORT_SARS_LOGBOOK", Set.of("ASSISTANT_HIGH", "ADMIN")),
            Map.entry("EXPORT_TRIPS", Set.of("MANAGER", "ADMIN")),
            Map.entry("EXPORT_EMAIL", Set.of("ADMIN"))
    );

    // ─── FLEET STATUS ───
    private static final Map<String, Set<String>> FLEET_STATUS_DEFAULTS = Map.ofEntries(
            Map.entry("VIEW_FLEET_STATUS", Set.of("MANAGER", "ADMIN"))
    );

    // ─── REPORT EXPORT ───
    private static final Map<String, Set<String>> REPORT_EXPORT_DEFAULTS = Map.ofEntries(
            Map.entry("VIEW_REPORT_EXPORTS", Set.of("SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "DRIVER", "ASSISTANT_HIGH", "ASSISTANT_LOW", "RENTAL_CUSTOMER", "FLEET", "SOLO"))
    );

    // ─── MASTER DEFAULT MAP ───
    private static final Map<String, Map<String, Set<String>>> DEFAULTS = Map.of(
            "EXPENSE_CATEGORY", EXPENSE_CATEGORY_DEFAULTS,
            "VEHICLE_ASSIGNMENT", VEHICLE_ASSIGNMENT_DEFAULTS,
            "LOGBOOK", LOGBOOK_DEFAULTS,
            "TAX_AUDIT", TAX_AUDIT_DEFAULTS,
            "EXPORT", EXPORT_DEFAULTS,
            "FLEET_STATUS", FLEET_STATUS_DEFAULTS,
            "REPORT_EXPORT", REPORT_EXPORT_DEFAULTS
    );

    // ─── PUBLIC CHECK METHOD (Organization context) ───
    public boolean isAllowed(UUID orgId, String permissionType, String permissionKey, String userRole, String assistantRole) {
        // SUPER_ADMIN bypasses everything
        if (UserRole.SUPER_ADMIN.name().equals(userRole)) {
            return true;
        }

        // For ASSISTANT role, use assistantRole for permission checks
        String effectiveRole = userRole;
        if (UserRole.ASSISTANT.name().equals(userRole) && assistantRole != null) {
            effectiveRole = assistantRole;
        }

        // Check for custom override in database
        Optional<Permission> override = permissionRepository
                .findByOrganizationIdAndPermissionTypeAndPermissionKeyAndUserRole(
                        orgId, permissionType, permissionKey, effectiveRole);

        if (override.isPresent()) {
            return override.get().getIsAllowed();
        }

        // Fall back to hardcoded defaults
        return getDefaultRoles(permissionType, permissionKey).contains(effectiveRole);
    }

    // ─── PUBLIC CHECK METHOD (Organization context) - backward compatible
    public boolean isAllowed(UUID orgId, String permissionType, String permissionKey, String userRole) {
        return isAllowed(orgId, permissionType, permissionKey, userRole, null);
    }

    // ─── PUBLIC CHECK METHOD (Individual account context) ───
    public boolean isAllowedForUser(UUID userId, String permissionType, String permissionKey, String userRole, String assistantRole) {
        // SUPER_ADMIN bypasses everything
        if (UserRole.SUPER_ADMIN.name().equals(userRole)) {
            return true;
        }

        // For ASSISTANT role, use assistantRole for permission checks
        String effectiveRole = userRole;
        if (UserRole.ASSISTANT.name().equals(userRole) && assistantRole != null) {
            effectiveRole = assistantRole;
        }

        // Check for custom override in database (user_id context)
        Optional<Permission> override = permissionRepository
                .findByUserIdAndPermissionTypeAndPermissionKeyAndUserRole(
                        userId, permissionType, permissionKey, effectiveRole);

        if (override.isPresent()) {
            return override.get().getIsAllowed();
        }

        // Fall back to hardcoded defaults
        return getDefaultRoles(permissionType, permissionKey).contains(effectiveRole);
    }

    // ─── PUBLIC CHECK METHOD (Individual account context) - backward compatible
    public boolean isAllowedForUser(UUID userId, String permissionType, String permissionKey, String userRole) {
        return isAllowedForUser(userId, permissionType, permissionKey, userRole, null);
    }

    // ─── BULK CHECK (for fetching all visible categories) ───
    public List<String> getAllowedKeys(UUID orgId, String permissionType, String userRole) {
        Map<String, Set<String>> typeDefaults = DEFAULTS.getOrDefault(permissionType, Map.of());
        List<String> allowed = new ArrayList<>();

        for (String key : typeDefaults.keySet()) {
            if (isAllowed(orgId, permissionType, key, userRole)) {
                allowed.add(key);
            }
        }
        return allowed;
    }

    // ─── GET PERMISSION MATRIX FOR UI ───
    public Map<String, Map<String, Map<String, Boolean>>> getPermissionMatrix(UUID orgId) {
        Map<String, Map<String, Map<String, Boolean>>> matrix = new LinkedHashMap<>();
        
        List<Permission> overrides = permissionRepository.findByOrganizationId(orgId);
        
        // Define all roles to include in matrix (including assistant sub-roles)
        List<String> allRoles = new ArrayList<>();
        for (UserRole role : UserRole.values()) {
            if (role == UserRole.SUPER_ADMIN) continue; // SUPER_ADMIN always sees everything
            allRoles.add(role.name());
            // Add assistant sub-roles for ASSISTANT
            if (role == UserRole.ASSISTANT) {
                allRoles.add("ASSISTANT_HIGH");
                allRoles.add("ASSISTANT_LOW");
            }
        }
        
        for (Map.Entry<String, Map<String, Set<String>>> typeEntry : DEFAULTS.entrySet()) {
            String permissionType = typeEntry.getKey();
            Map<String, Set<String>> typeDefaults = typeEntry.getValue();
            
            Map<String, Map<String, Boolean>> typeMatrix = new LinkedHashMap<>();
            
            for (String permissionKey : typeDefaults.keySet()) {
                Map<String, Boolean> roleMatrix = new LinkedHashMap<>();
                
                for (String role : allRoles) {
                    // Check for override
                    Optional<Permission> override = overrides.stream()
                            .filter(p -> p.getPermissionType().equals(permissionType) 
                                    && p.getPermissionKey().equals(permissionKey) 
                                    && p.getUserRole().equals(role))
                            .findFirst();
                    
                    if (override.isPresent()) {
                        roleMatrix.put(role, override.get().getIsAllowed());
                    } else {
                        // Use default
                        roleMatrix.put(role, typeDefaults.get(permissionKey).contains(role));
                    }
                }
                
                typeMatrix.put(permissionKey, roleMatrix);
            }
            
            matrix.put(permissionType, typeMatrix);
        }
        
        return matrix;
    }

    // ─── SET OVERRIDE (SUPER_ADMIN only) ───
    @Transactional
    public Permission setOverride(UUID orgId, String permissionType, String permissionKey,
                                  String userRole, boolean isAllowed) {
        Optional<Permission> existing = permissionRepository
                .findByOrganizationIdAndPermissionTypeAndPermissionKeyAndUserRole(
                        orgId, permissionType, permissionKey, userRole);

        Permission permission;
        if (existing.isPresent()) {
            permission = existing.get();
            permission.setIsAllowed(isAllowed);
            log.info("Updated permission override for org {} type {} key {} role {} to {}",
                    orgId, permissionType, permissionKey, userRole, isAllowed);
        } else {
            permission = Permission.builder()
                    .organizationId(orgId)
                    .permissionType(permissionType)
                    .permissionKey(permissionKey)
                    .userRole(userRole)
                    .isAllowed(isAllowed)
                    .build();
            log.info("Created permission override for org {} type {} key {} role {} to {}",
                    orgId, permissionType, permissionKey, userRole, isAllowed);
        }
        
        return permissionRepository.save(permission);
    }

    // ─── DELETE OVERRIDE (reset to default) ───
    @Transactional
    public void deleteOverride(UUID orgId, String permissionType, String permissionKey, String userRole) {
        permissionRepository.deleteByOrganizationIdAndPermissionTypeAndPermissionKeyAndUserRole(
                orgId, permissionType, permissionKey, userRole);
        log.info("Deleted permission override for org {} type {} key {} role {} (reverting to default)",
                orgId, permissionType, permissionKey, userRole);
    }

    // ─── RESET ALL FOR ORGANIZATION ───
    @Transactional
    public void resetAllForOrganization(UUID orgId) {
        permissionRepository.deleteByOrganizationId(orgId);
        log.info("Reset all permission overrides for organization {}", orgId);
    }

    // ─── RESET ALL FOR USER ───
    @Transactional
    public void resetAllForUser(UUID userId) {
        permissionRepository.deleteByUserId(userId);
        log.info("Reset all permission overrides for user {}", userId);
    }

    // ─── GET ALL OVERRIDES FOR ORG ───
    public List<Permission> getOverridesForOrganization(UUID orgId) {
        return permissionRepository.findByOrganizationId(orgId);
    }

    // ─── GET ALL OVERRIDES FOR USER ───
    public List<Permission> getOverridesForUser(UUID userId) {
        return permissionRepository.findByUserId(userId);
    }

    // ─── HELPER: Get default roles for a permission ───
    private Set<String> getDefaultRoles(String permissionType, String permissionKey) {
        return DEFAULTS
                .getOrDefault(permissionType, Map.of())
                .getOrDefault(permissionKey, Set.of());
    }
}
