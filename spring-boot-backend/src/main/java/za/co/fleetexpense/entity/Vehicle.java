package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.DrivetrainType;
import za.co.fleetexpense.entity.enums.FuelType;
import za.co.fleetexpense.entity.enums.VehicleStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicles", indexes = {
    @Index(name = "idx_vehicles_organization", columnList = "organization_id"),
    @Index(name = "idx_vehicles_driver", columnList = "assigned_driver_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_driver_id")
    private User assignedDriver;

    @Column(name = "registration_number", nullable = false)
    private String registrationNumber;

    private String vin;

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private Integer year;

    private String nickname;

    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Column(name = "tank_capacity_liters")
    private BigDecimal tankCapacityLiters;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Builder.Default
    @Column(name = "current_odometer", nullable = false)
    private Integer currentOdometer = 0;

    @Transient
    private Integer computedOdometer;

    @Enumerated(EnumType.STRING)
    @Column(name = "drivetrain_type")
    private DrivetrainType drivetrainType;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_price")
    private BigDecimal purchasePrice;

    @Column(name = "license_expiry")
    private LocalDate licenseExpiry;

    @Column(name = "insurance_policy_number")
    private String insurancePolicyNumber;

    @Column(name = "tracker_serial")
    private String trackerSerial;

    private String notes;

    @Column(name = "is_locked")
    @Builder.Default
    private Boolean isLocked = false;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by_user_id")
    private User lockedByUser;

    @Column(name = "locked_reason")
    private String lockedReason;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private VehicleStatus status = VehicleStatus.ACTIVE;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "rejected_at")
    private OffsetDateTime rejectedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejected_by_user_id")
    private User rejectedByUser;

    @Column(name = "compliant")
    @Builder.Default
    private Boolean compliant = false;

    // Service intervals (in kilometers)
    @Column(name = "minor_service_interval_km")
    private Integer minorServiceIntervalKm;

    @Column(name = "major_service_interval_km")
    private Integer majorServiceIntervalKm;

    @Column(name = "brake_overhaul_interval_km")
    private Integer brakeOverhaulIntervalKm;

    // Service intervals (in months)
    @Column(name = "minor_service_interval_months")
    private Integer minorServiceIntervalMonths;

    @Column(name = "major_service_interval_months")
    private Integer majorServiceIntervalMonths;

    @Column(name = "brake_overhaul_interval_months")
    private Integer brakeOverhaulIntervalMonths;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @JsonProperty
    public Integer getCurrentOdometer() {
        return computedOdometer != null ? computedOdometer : currentOdometer;
    }

    /**
     * Returns the STORED manual baseline. Use this for fuel calculations
     * and tax validation. NOT serialized to frontend.
     */
    public Integer getCurrentOdometerStored() {
        return this.currentOdometer;
    }

    /**
     * Sets the STORED manual baseline. Use this for fuel calculations
     * and tax validation. NOT serialized to frontend.
     */
    public void setCurrentOdometerStored(Integer odometer) {
        this.currentOdometer = odometer;
    }

    @Deprecated
    public void setCurrentOdometer(Integer odometer) {
        this.currentOdometer = odometer;
    }

    public void setComputedOdometer(Integer odometer) {
        this.computedOdometer = odometer;
    }
}
