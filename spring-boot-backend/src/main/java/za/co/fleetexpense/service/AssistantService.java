package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.Permission;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.UserAssistant;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.repository.PermissionRepository;
import za.co.fleetexpense.repository.UserAssistantRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.service.EmailService;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssistantService {

    private final UserAssistantRepository userAssistantRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // Default permissions for ASSISTANT_LOW (View-Only)
    private static final Map<String, Set<String>> ASSISTANT_LOW_DEFAULTS = Map.of(
        "LOGBOOK", Set.of("VIEW_LOGBOOK"),
        "EXPENSE_CATEGORY", Set.of(
            "FUEL_LOG", "MECHANIC_SERVICE", "MAINTENANCE_TOPUP", "TIRES",
            "CAR_WASH", "INSURANCE_PREMIUM", "VEHICLE_TRACKING", "ETOLL_SANRAL",
            "LICENSE_RENEWAL", "PERSONAL_LICENSE", "ROADWORTHY", "OTHER_FIXED"
        ),
        "EXPORT", Set.of("EXPORT_SARS_LOGBOOK")
    );

    // Default permissions for ASSISTANT_HIGH (Edit Access)
    private static final Map<String, Set<String>> ASSISTANT_HIGH_DEFAULTS = Map.of(
        "LOGBOOK", Set.of("VIEW_LOGBOOK", "ADD_TRIP", "EDIT_TRIP"),
        "EXPENSE_CATEGORY", Set.of(
            "FUEL_LOG", "MECHANIC_SERVICE", "MAINTENANCE_TOPUP", "TIRES",
            "CAR_WASH", "INSURANCE_PREMIUM", "VEHICLE_TRACKING", "ETOLL_SANRAL",
            "LICENSE_RENEWAL", "PERSONAL_LICENSE", "ROADWORTHY", "OTHER_FIXED"
        ),
        "EXPORT", Set.of("EXPORT_SARS_LOGBOOK", "EXPORT_TRIPS", "EXPORT_EMAIL")
    );

    @Transactional
    public UserAssistant addAssistant(UUID ownerId, String assistantEmail, String assistantFirstName, String assistantLastName,
                                     String assistantRole, LocalDate dateRangeStart, LocalDate dateRangeEnd, UUID assignedVehicleId, String password) {
        // Validate owner exists
        User owner = userRepository.findById(ownerId)
            .orElseThrow(() -> new IllegalArgumentException("Owner not found"));

        // Validate assistant role
        if (!assistantRole.equals("ASSISTANT_LOW") && !assistantRole.equals("ASSISTANT_HIGH")) {
            throw new IllegalArgumentException("Invalid assistant role");
        }

        // Check if user already exists - if they do, they can be added as assistant
        // If they don't exist, we still create the assistant relationship without creating a user account
        // The assistant will need to register later to get full account access
        User assistant = userRepository.findByEmail(assistantEmail).orElse(null);
        UUID assistantId;
        
        if (assistant == null) {
            // Create new user with temporary password (like fleet side)
            String tempPassword = password != null ? password : "Password1234";
            assistant = User.builder()
                .email(assistantEmail)
                .firstName(assistantFirstName != null ? assistantFirstName : "")
                .lastName(assistantLastName != null ? assistantLastName : "")
                .passwordHash(passwordEncoder.encode(tempPassword))
                .role(UserRole.ASSISTANT)
                .organization(owner.getOrganization())
                .emailVerified(false)
                .isActive(true) // Active so they can log in immediately
                .build();
            assistant = userRepository.save(assistant);
            assistantId = assistant.getId();
            
            // Send invitation email with temporary password (like fleet side)
            String inviterName = owner.getFirstName() + " " + owner.getLastName();
            emailService.sendTeamInvitationEmail(assistant.getEmail(), owner.getOrganization().getName(), tempPassword, inviterName);
        } else {
            assistantId = assistant.getId();
            // Check if user is already in an organization (not the owner's org)
            if (assistant.getOrganization() != null && !assistant.getOrganization().getId().equals(owner.getOrganization().getId())) {
                throw new IllegalArgumentException("User is already in another organization");
            }
            // Activate if they were inactive
            if (!assistant.getIsActive()) {
                assistant.setIsActive(true);
                userRepository.save(assistant);
            }
        }

        // Check if already exists
        if (userAssistantRepository.existsByOwnerIdAndAssistantId(ownerId, assistantId)) {
            throw new IllegalArgumentException("Assistant already added to this owner");
        }

        // Create assistant relationship
        UserAssistant userAssistant = UserAssistant.builder()
            .ownerId(ownerId)
            .assistantId(assistantId)
            .assistantRole(assistantRole)
            .assignedDateRangeStart(dateRangeStart)
            .assignedDateRangeEnd(dateRangeEnd)
            .assignedVehicleId(assignedVehicleId)
            .build();

        userAssistant = userAssistantRepository.save(userAssistant);

        // Apply default permissions for this assistant (no organization context for individual accounts)
        // Individual assistants are scoped via user_assistants table, not organization_id
        applyDefaultPermissions(assistantId, assistantRole, null);

        return userAssistant;
    }

    @Transactional
    public UserAssistant updateAssistant(UUID ownerId, UUID assistantId, String assistantRole,
                                        LocalDate dateRangeStart, LocalDate dateRangeEnd, UUID assignedVehicleId, Boolean isActive) {
        UserAssistant userAssistant = userAssistantRepository.findByOwnerIdAndAssistantId(ownerId, assistantId)
            .orElseThrow(() -> new IllegalArgumentException("Assistant relationship not found"));

        // Update role if changed
        if (assistantRole != null && !userAssistant.getAssistantRole().equals(assistantRole)) {
            userAssistant.setAssistantRole(assistantRole);
            // Reapply permissions with new role (no organization context for individual accounts)
            applyDefaultPermissions(assistantId, assistantRole, null);
        }

        if (dateRangeStart != null) {
            userAssistant.setAssignedDateRangeStart(dateRangeStart);
        }
        if (dateRangeEnd != null) {
            userAssistant.setAssignedDateRangeEnd(dateRangeEnd);
        }
        if (assignedVehicleId != null) {
            userAssistant.setAssignedVehicleId(assignedVehicleId);
        }

        // Reactivate if requested
        if (isActive != null && isActive && !userAssistant.getIsActive()) {
            userAssistant.setIsActive(true);
            userAssistant.setRemovedAt(null);
            userAssistant.setRemovedBy(null);
            // Reapply permissions
            applyDefaultPermissions(assistantId, userAssistant.getAssistantRole(), null);
        }

        return userAssistantRepository.save(userAssistant);
    }

    @Transactional
    public void removeAssistant(UUID ownerId, UUID assistantId, UUID removedByUserId) {
        UserAssistant userAssistant = userAssistantRepository.findByOwnerIdAndAssistantId(ownerId, assistantId)
            .orElseThrow(() -> new IllegalArgumentException("Assistant relationship not found"));

        // Soft delete - set is_active to false and record removal details
        userAssistant.setIsActive(false);
        userAssistant.setRemovedAt(java.time.OffsetDateTime.now());
        userAssistant.setRemovedBy(removedByUserId);

        userAssistantRepository.save(userAssistant);

        // Remove all permissions for this assistant (they can no longer access)
        permissionRepository.deleteByUserId(assistantId);
    }

    public List<UserAssistant> getAssistantsForOwner(UUID ownerId) {
        return userAssistantRepository.findByOwnerId(ownerId);
    }

    public Optional<UserAssistant> getAssistantRelationship(UUID ownerId, UUID assistantId) {
        return userAssistantRepository.findByOwnerIdAndAssistantId(ownerId, assistantId);
    }

    public List<UserAssistant> getOwnersForAssistant(UUID assistantId) {
        return userAssistantRepository.findByAssistantId(assistantId);
    }

    private void applyDefaultPermissions(UUID assistantId, String assistantRole, UUID organizationId) {
        // Clear existing permissions for this user
        permissionRepository.deleteByUserId(assistantId);

        Map<String, Set<String>> defaults = assistantRole.equals("ASSISTANT_LOW")
            ? ASSISTANT_LOW_DEFAULTS
            : ASSISTANT_HIGH_DEFAULTS;

        for (Map.Entry<String, Set<String>> entry : defaults.entrySet()) {
            String permissionType = entry.getKey();
            Set<String> permissionKeys = entry.getValue();

            for (String permissionKey : permissionKeys) {
                Permission permission = Permission.builder()
                    .userId(assistantId)
                    .organizationId(organizationId)
                    .permissionType(permissionType)
                    .permissionKey(permissionKey)
                    .userRole(assistantRole)
                    .isAllowed(true)
                    .build();
                permissionRepository.save(permission);
            }
        }
    }

    public boolean hasPermission(UUID userId, String permissionType, String permissionKey) {
        // Check if user has an override permission
        Optional<Permission> override = permissionRepository.findByUserIdAndPermissionTypeAndPermissionKeyAndUserRole(
            userId, permissionType, permissionKey, null
        );

        if (override.isPresent()) {
            return override.get().getIsAllowed();
        }

        // Check if user is an assistant and has default permissions
        List<UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        if (!assistantRelationships.isEmpty()) {
            UserAssistant relationship = assistantRelationships.get(0);
            String assistantRole = relationship.getAssistantRole();

            Map<String, Set<String>> defaults = assistantRole.equals("ASSISTANT_LOW")
                ? ASSISTANT_LOW_DEFAULTS
                : ASSISTANT_HIGH_DEFAULTS;

            return defaults.getOrDefault(permissionType, Collections.emptySet()).contains(permissionKey);
        }

        return false;
    }
}
