package za.co.fleetexpense.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;
import za.co.fleetexpense.entity.enums.UserRole;

@Data
public class UserUpdateRequest {
    @Email(message = "Invalid email format")
    private String email;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private String firstName;

    private String lastName;

    private String phone;

    private UserRole role;

    private Boolean emailVerified;

    private Boolean isActive;
}
