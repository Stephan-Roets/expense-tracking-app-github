package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import za.co.fleetexpense.entity.enums.DrivetrainType;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class VehicleCreateRequest {
    // Organization ID comes from authenticated user principal, not request body
    private UUID organizationId;

    @NotBlank(message = "Make is required")
    private String make;

    @NotBlank(message = "Model is required")
    private String model;

    @NotNull(message = "Year is required")
    private Integer year;

    @NotBlank(message = "Registration number is required")
    private String registrationNumber;

    private String vin;
    private String nickname;
    private String color;

    @NotNull(message = "Fuel type is required")
    private FuelType fuelType;

    private BigDecimal tankCapacityLiters;
    private Integer currentOdometer;
    private DrivetrainType drivetrainType;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;
    private LocalDate licenseExpiry;
    private String insurancePolicyNumber;
    private String trackerSerial;
    private String notes;
    private UUID assignedDriverId;

    // Service intervals (in kilometers)
    private Integer minorServiceIntervalKm;
    private Integer majorServiceIntervalKm;
    private Integer brakeOverhaulIntervalKm;

    // Service intervals (in months)
    private Integer minorServiceIntervalMonths;
    private Integer majorServiceIntervalMonths;
    private Integer brakeOverhaulIntervalMonths;
}
