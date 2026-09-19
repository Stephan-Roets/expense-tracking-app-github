package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import za.co.fleetexpense.entity.enums.DrivetrainType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tyre_rotation_trackings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TyreRotationTracking {

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
    @JoinColumn(name = "tyre_expense_id", nullable = false)
    private Expense tyreExpense;

    @Enumerated(EnumType.STRING)
    @Column(name = "drivetrain_type", nullable = false)
    private DrivetrainType drivetrainType;

    @Column(name = "rotation_interval_km", nullable = false)
    @Builder.Default
    private Integer rotationIntervalKm = 8000;

    @Column(name = "installation_odometer", nullable = false)
    private Integer installationOdometer;

    @Column(name = "last_rotation_odometer")
    private Integer lastRotationOdometer;

    @Column(name = "last_rotation_date")
    private LocalDate lastRotationDate;

    @Column(name = "rotation_count", nullable = false)
    @Builder.Default
    private Integer rotationCount = 0;

    @Column(name = "next_rotation_odometer", nullable = false)
    private Integer nextRotationOdometer;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_dismissed", nullable = false)
    @Builder.Default
    private Boolean isDismissed = false;

    @Column(name = "dismissed_at")
    private OffsetDateTime dismissedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dismissed_by_user_id")
    private User dismissedByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
