package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.UpdateOrganizationRequest;
import za.co.fleetexpense.dto.UserCreateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final StorageService storageService;

    public Organization getById(UUID id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));
    }

    @Transactional
    public Organization update(UUID id, UpdateOrganizationRequest request) {
        Organization organization = getById(id);
        
        if (request.getName() != null) {
            organization.setName(request.getName());
        }
        if (request.getTaxNumber() != null) {
            organization.setTaxNumber(request.getTaxNumber());
        }
        if (request.getVatNumber() != null) {
            organization.setVatNumber(request.getVatNumber());
        }
        if (request.getAddressLine1() != null) {
            organization.setAddressLine1(request.getAddressLine1());
        }
        if (request.getAddressLine2() != null) {
            organization.setAddressLine2(request.getAddressLine2());
        }
        if (request.getCity() != null) {
            organization.setCity(request.getCity());
        }
        if (request.getProvince() != null) {
            organization.setProvince(request.getProvince());
        }
        if (request.getPostalCode() != null) {
            organization.setPostalCode(request.getPostalCode());
        }
        if (request.getPhone() != null) {
            organization.setPhone(request.getPhone());
        }
        if (request.getConditionReportEnabled() != null) {
            organization.setConditionReportEnabled(request.getConditionReportEnabled());
        }
        if (request.getOdometerConfirmationEnabled() != null) {
            organization.setOdometerConfirmationEnabled(request.getOdometerConfirmationEnabled());
        }
        if (request.getDefaultTaxCalculationMethod() != null) {
            organization.setDefaultTaxCalculationMethod(request.getDefaultTaxCalculationMethod());
        }
        
        return organizationRepository.save(organization);
    }

    @Transactional(readOnly = true)
    public List<User> getUsersByOrganization(UUID organizationId, UUID currentUserId) {
        Organization organization = getById(organizationId);
        List<User> users = userRepository.findByOrganizationIdAndIsActiveTrue(organizationId);
        if (organization.getMode() == OrganizationMode.SOLO) {
            // SOLO mode: only the current user should be visible
            return users.stream()
                    .filter(u -> u.getId().equals(currentUserId))
                    .collect(java.util.stream.Collectors.toList());
        }
        return users;
    }

    @Transactional
    public User createUser(UserCreateRequest request, UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        // SOLO mode: no additional users allowed
        if (organization.getMode() == OrganizationMode.SOLO) {
            throw new ValidationException("Cannot add users in SOLO mode. Switch to FLEET mode to invite team members.");
        }

        // Check if email already exists globally
        Optional<User> existingUserGlobal = userRepository.findByEmail(request.getEmail());
        if (existingUserGlobal.isPresent()) {
            User existingUser = existingUserGlobal.get();
            // Check if it's in the same organization
            if (existingUser.getOrganization().getId().equals(organizationId)) {
                if (existingUser.getIsActive()) {
                    throw new ValidationException("Email already registered in this organization");
                }
                // Reactivate the user in the same organization
                existingUser.setIsActive(true);
                existingUser.setFirstName(request.getFirstName() != null ? request.getFirstName() : existingUser.getFirstName());
                existingUser.setLastName(request.getLastName() != null ? request.getLastName() : existingUser.getLastName());
                existingUser.setRole(request.getRole() != null ? request.getRole() : existingUser.getRole());
                if (request.getPassword() != null) {
                    existingUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                }
                User savedUser = userRepository.save(existingUser);
                // Send invitation email for reactivated user
                String tempPassword = request.getPassword() != null ? request.getPassword() : "Password1234";
                String inviterName = request.getInviterName() != null ? request.getInviterName() : "Administrator";
                emailService.sendTeamInvitationEmail(savedUser.getEmail(), organization.getName(), tempPassword, inviterName);
                return savedUser;
            } else {
                // Email exists in a different organization
                throw new ValidationException("Email already registered in another organization");
            }
        }

        String[] emailParts = request.getEmail().split("@");
        String tempPassword = request.getPassword() != null ? request.getPassword() : "Password1234";
        User user = User.builder()
                .organization(organization)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstName(request.getFirstName() != null ? request.getFirstName() : emailParts[0])
                .lastName(request.getLastName() != null ? request.getLastName() : "User")
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : UserRole.DRIVER)
                .emailVerified(false)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);
        
        // Send invitation email
        String inviterName = request.getInviterName() != null ? request.getInviterName() : "Administrator";
        emailService.sendTeamInvitationEmail(savedUser.getEmail(), organization.getName(), tempPassword, inviterName);
        
        return savedUser;
    }

    @Transactional
    public User deactivateUser(UUID userId, UUID organizationId, UUID currentUserId, UserRole currentUserRole) {
        Organization organization = getById(organizationId);

        // SOLO mode: cannot deactivate the sole user
        if (organization.getMode() == OrganizationMode.SOLO) {
            throw new ValidationException("Cannot deactivate users in SOLO mode");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Verify user belongs to the organization
        if (!user.getOrganization().getId().equals(organizationId)) {
            throw new ValidationException("User does not belong to this organization");
        }

        // Managers cannot delete admins
        if (currentUserRole == UserRole.MANAGER && user.getRole() == UserRole.ADMIN) {
            throw new ValidationException("Managers cannot delete admins");
        }

        // Prevent deletion of the last admin in the organization
        if (user.getRole() == UserRole.ADMIN) {
            List<User> activeAdmins = userRepository.findByOrganizationIdAndRoleAndIsActiveTrue(organizationId, UserRole.ADMIN);
            if (activeAdmins.size() <= 1) {
                throw new ValidationException("Cannot delete the last admin in the organization");
            }
        }

        user.setIsActive(false);
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(UUID userId, UUID organizationId, za.co.fleetexpense.dto.UserUpdateRequest request, UUID currentUserId, UserRole currentUserRole) {
        Organization organization = getById(organizationId);

        // SOLO mode: cannot update other users
        if (organization.getMode() == OrganizationMode.SOLO) {
            throw new ValidationException("Cannot update users in SOLO mode");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Verify user belongs to the organization
        if (!user.getOrganization().getId().equals(organizationId)) {
            throw new ValidationException("User does not belong to this organization");
        }

        // Managers cannot change admin roles
        if (currentUserRole == UserRole.MANAGER && request.getRole() != null) {
            // Manager trying to change someone's role
            if (!request.getRole().equals(user.getRole())) {
                // If trying to change to or from ADMIN, prevent it
                if (user.getRole() == UserRole.ADMIN || request.getRole() == UserRole.ADMIN) {
                    throw new ValidationException("Managers cannot change admin roles");
                }
            }
        }

        // Prevent changing the last admin to a non-admin role
        if (user.getRole() == UserRole.ADMIN && request.getRole() != null && request.getRole() != UserRole.ADMIN) {
            List<User> activeAdmins = userRepository.findByOrganizationIdAndRoleAndIsActiveTrue(organizationId, UserRole.ADMIN);
            if (activeAdmins.size() <= 1) {
                throw new ValidationException("Cannot change the role of the last admin in the organization");
            }
        }

        // Apply updates
        if (request.getEmail() != null) {
            // Check if email is already taken by another user
            userRepository.findByEmail(request.getEmail()).ifPresent(existingUser -> {
                if (!existingUser.getId().equals(userId)) {
                    throw new ValidationException("Email already registered");
                }
            });
            user.setEmail(request.getEmail());
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        if (request.getEmailVerified() != null) {
            user.setEmailVerified(request.getEmailVerified());
        }

        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }

        if (request.getPassword() != null) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public String uploadOrganizationLogo(UUID organizationId, org.springframework.web.multipart.MultipartFile file) {
        Organization organization = getById(organizationId);

        // Upload logo to storage
        StorageService.UploadResult result = storageService.uploadFile(
            file,
            "organization-logos",
            organizationId
        );

        // Update organization with new logo URL
        organization.setLogoUrl(result.getUrl());
        organizationRepository.save(organization);

        return result.getUrl();
    }

    @Transactional
    public void removeOrganizationLogo(UUID organizationId) {
        Organization organization = getById(organizationId);

        if (organization.getLogoUrl() != null) {
            // Delete file from storage
            try {
                String key = organizationId.toString() + "/" + organization.getLogoUrl().substring(organization.getLogoUrl().lastIndexOf('/') + 1);
                storageService.deleteFile("organization-logos", key);
            } catch (Exception e) {
                log.warn("Failed to delete logo from storage: {}", e.getMessage());
            }

            // Clear logo URL
            organization.setLogoUrl(null);
            organizationRepository.save(organization);
        }
    }
}
