package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import za.co.fleetexpense.enums.OdometerConfirmationPurpose;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "odometer_confirmation",
    uniqueConstraints = @UniqueConstraint(columnNames = {"assignment_id", "purpose"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OdometerConfirmation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private VehicleAssignment assignment;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 20)
    @Builder.Default
    private OdometerConfirmationPurpose purpose = OdometerConfirmationPurpose.ONBOARDING;

    @Column(name = "odometer_reading", nullable = false)
    private Integer odometerReading;

    @Column(name = "confirmation_image_url")
    private String confirmationImageUrl;

    @Column(name = "confirmed_at", nullable = false)
    private OffsetDateTime confirmedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by_id", nullable = false)
    private User confirmedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
