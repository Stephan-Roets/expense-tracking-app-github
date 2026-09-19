package za.co.fleetexpense.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import za.co.fleetexpense.entity.enums.UserRole;

import java.util.UUID;

@Data
public class UserCreateRequest {
    private UUID organizationId;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String password;

    private String firstName;

    private String lastName;

    private String phone;

    @NotNull(message = "Role is required")
    private UserRole role;

    private String inviterName;
}
