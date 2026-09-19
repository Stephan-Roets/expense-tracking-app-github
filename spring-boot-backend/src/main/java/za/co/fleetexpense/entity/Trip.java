package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@SQLRestriction("is_deleted = false")
@Table(name = "trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "trip_date", nullable = false)
    private LocalDate tripDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "start_odometer", nullable = false)
    private Integer startOdometer;

    @Column(name = "end_odometer", nullable = false)
    private Integer endOdometer;

    @Column(name = "distance_km", insertable = false, updatable = false)
    @org.hibernate.annotations.Generated
    private Integer distanceKm;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false)
    private TripPurpose purpose;

    @Column(name = "start_location", nullable = false)
    private String startLocation;

    @Column(name = "end_location", nullable = false)
    private String endLocation;

    @Column(name = "route_description")
    private String routeDescription;

    @Column(name = "customer_client_name")
    private String customerClientName;

    @Column(name = "reason_for_trip")
    private String reasonForTrip;

    @Column(name = "toll_costs_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal tollCostsZar = BigDecimal.ZERO;

    @Column(name = "parking_costs_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal parkingCostsZar = BigDecimal.ZERO;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private Boolean isLocked = false;

    /** Soft-deleted trips remain available for odometer recalculation and audit history. */
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by_user_id")
    private User lockedByUser;

    @Column(name = "locked_reason")
    private String lockedReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
