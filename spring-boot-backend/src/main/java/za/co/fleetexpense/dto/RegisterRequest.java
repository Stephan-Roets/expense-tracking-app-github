package za.co.fleetexpense.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.UserRole;

@Data
public class RegisterRequest {
    @NotBlank(message = "Organization name is required")
    private String organizationName;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = ".*[A-Z].*", message = "Password must contain at least one uppercase letter")
    @Pattern(regexp = ".*[a-z].*", message = "Password must contain at least one lowercase letter")
    @Pattern(regexp = ".*\\d.*", message = "Password must contain at least one number")
    @Pattern(regexp = ".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*", message = "Password must contain at least one special character")
    private String password;

    private String phone;

    // Account type: SOLO (individual) or FLEET
    private OrganizationMode organizationMode;

    // User role: ADMIN, MANAGER, or DRIVER
    private UserRole role;
}
