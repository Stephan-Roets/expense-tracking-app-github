package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    private UUID id;
    private UUID organizationId;
    private String organizationName;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private UserRole role;
    private Boolean emailVerified;
    private Boolean isActive;
    private Boolean passwordChanged;
    private String profilePhotoUrl;
    private OffsetDateTime lastLoginAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
