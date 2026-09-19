package za.co.fleetexpense.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "odometer_drift_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OdometerDriftAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    @JsonIgnore
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    @JsonIgnore
    private Vehicle vehicle;

    @Column(name = "vehicle_id", insertable = false, updatable = false)
    private UUID vehicleId;

    @Column(name = "vehicle_registration", nullable = false)
    private String vehicleRegistration;

    @Column(name = "stored_odometer", nullable = false)
    private Integer storedOdometer;

    @Column(name = "computed_odometer", nullable = false)
    private Integer computedOdometer;

    @Column(name = "is_dismissed", nullable = false)
    @Builder.Default
    private Boolean isDismissed = false;

    @Column(name = "dismissed_at")
    private OffsetDateTime dismissedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dismissed_by_user_id")
    @JsonIgnore
    private User dismissedByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
