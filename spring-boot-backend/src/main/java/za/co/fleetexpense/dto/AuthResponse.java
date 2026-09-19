package za.co.fleetexpense.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private UUID userId;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private UUID organizationId;
    private String organizationName;
    private String organizationMode;
    private UUID organizationOwnerId;
    private Boolean emailVerified;
    private Boolean passwordChanged;
    private String verificationToken;
    private Boolean emailSent;
}
