package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tyre_rotation_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TyreRotationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tracking_id", nullable = false)
    private TyreRotationTracking tracking;

    @Column(name = "rotation_date", nullable = false)
    private LocalDate rotationDate;

    @Column(name = "rotation_odometer", nullable = false)
    private Integer rotationOdometer;

    @Column(name = "rotation_pattern", length = 50)
    private String rotationPattern;

    @Column(name = "performed_by")
    private String performedBy;

    @Column(name = "notes")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
