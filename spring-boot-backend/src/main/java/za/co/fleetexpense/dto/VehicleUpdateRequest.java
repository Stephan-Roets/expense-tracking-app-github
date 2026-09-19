package za.co.fleetexpense.dto;

import lombok.Data;
import za.co.fleetexpense.entity.enums.DrivetrainType;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class VehicleUpdateRequest {
    private String make;
    private String model;
    private Integer year;
    private String registrationNumber;
    private String vin;
    private String nickname;
    private String color;
    private FuelType fuelType;
    private BigDecimal tankCapacityLiters;
    private Integer currentOdometer;
    private DrivetrainType drivetrainType;
    private LocalDate licenseExpiry;
    private String insurancePolicyNumber;
    private String trackerSerial;
    private String notes;
    private Boolean isActive;
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
