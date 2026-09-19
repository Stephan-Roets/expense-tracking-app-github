package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.AuthResponse;
import za.co.fleetexpense.dto.LoginRequest;
import za.co.fleetexpense.dto.RegisterRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.JwtTokenProvider;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${FRONTEND_URL:https://vehicle-expense-and-sa-fleet-manage.vercel.app}")
    private String frontendUrl;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ValidationException("Email already registered");
        }

        // Create organization - use mode from request or default to SOLO
        OrganizationMode mode = request.getOrganizationMode() != null
                ? request.getOrganizationMode()
                : OrganizationMode.SOLO;

        Organization organization = Organization.builder()
                .name(request.getOrganizationName())
                .mode(mode)
                .build();
        organization = organizationRepository.save(organization);

        // Generate email verification token
        String verificationToken = UUID.randomUUID().toString();

        // Create user - creator is always SUPER_ADMIN for new organizations
        UserRole role = UserRole.SUPER_ADMIN;

        User user = User.builder()
                .organization(organization)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .role(role)
                .emailVerified(false)
                .emailVerificationToken(verificationToken)
                .passwordChanged(true)
                .isActive(true)
                .build();

        user = userRepository.save(user);

        // Set the organization owner to the creator
        organization.setOwnerId(user.getId());
        organizationRepository.save(organization);

        // Send confirmation email and check if it was sent successfully
        String confirmationLink = frontendUrl + "/confirm-email?token=" + verificationToken;
        String username = request.getFirstName() + " " + request.getLastName();
        boolean emailSent = emailService.sendConfirmationEmail(request.getEmail(), confirmationLink, username);

        // Generate tokens
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .accessToken(token)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .organizationId(organization.getId())
                .organizationName(organization.getName())
                .organizationMode(organization.getMode().name())
                .organizationOwnerId(organization.getOwnerId())
                .emailVerified(false)
                .verificationToken(verificationToken)
                .emailSent(emailSent)
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ValidationException("Invalid credentials"));

        // Update last login
        user.setLastLogin(java.time.OffsetDateTime.now());
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .accessToken(token)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .organizationId(user.getOrganization().getId())
                .organizationName(user.getOrganization().getName())
                .organizationMode(user.getOrganization().getMode().name())
                .organizationOwnerId(user.getOrganization().getOwnerId())
                .emailVerified(user.getEmailVerified())
                .passwordChanged(user.getPasswordChanged())
                .build();
    }

    @Transactional
    public AuthResponse verifyEmail(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new ValidationException("Verification token is missing");
        }

        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new ValidationException("Invalid or expired verification link. This link may have already been used or is invalid. Please request a new confirmation email."));

        // Check if already verified
        if (user.getEmailVerified()) {
            throw new ValidationException("Email has already been verified. You can now log in to your account.");
        }

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        userRepository.save(user);

        // Generate token for automatic login after verification
        String jwtToken = jwtTokenProvider.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .accessToken(jwtToken)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .organizationId(user.getOrganization().getId())
                .organizationName(user.getOrganization().getName())
                .organizationMode(user.getOrganization().getMode().name())
                .emailVerified(true)
                .build();
    }
}
