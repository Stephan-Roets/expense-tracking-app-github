package za.co.fleetexpense.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    private String firstName;
    private String lastName;
    private String phone;
    private String employeeNumber;
    private String driversLicenseNumber;
    private LocalDate driversLicenseExpiry;
}
