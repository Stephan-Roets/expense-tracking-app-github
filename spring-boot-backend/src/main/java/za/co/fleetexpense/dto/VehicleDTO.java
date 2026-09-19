package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.DrivetrainType;
import za.co.fleetexpense.entity.enums.FuelType;
import za.co.fleetexpense.entity.enums.VehicleStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VehicleDTO {
    private UUID id;
    private UUID organizationId;
    private String registrationNumber;
    private String vin;
    private String make;
    private String model;
    private Integer year;
    private String nickname;
    private String color;
    private FuelType fuelType;
    private BigDecimal tankCapacityLiters;
    private Integer currentOdometer;
    private Integer computedOdometer;
    private DrivetrainType drivetrainType;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;
    private LocalDate licenseExpiry;
    private String insurancePolicyNumber;
    private String trackerSerial;
    private String notes;
    private Boolean isLocked;
    private OffsetDateTime lockedAt;
    private String lockedReason;
    private VehicleStatus status;
    private String rejectionReason;
    private OffsetDateTime rejectedAt;
    private UUID rejectedByUserId;
    private String rejectedByName;
    private Boolean isActive;
    private Boolean compliant;
    private UUID assignedDriverId;
    private String assignedDriverName;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Service intervals (in kilometers)
    private Integer minorServiceIntervalKm;
    private Integer majorServiceIntervalKm;
    private Integer brakeOverhaulIntervalKm;

    // Service intervals (in months)
    private Integer minorServiceIntervalMonths;
    private Integer majorServiceIntervalMonths;
    private Integer brakeOverhaulIntervalMonths;
}
