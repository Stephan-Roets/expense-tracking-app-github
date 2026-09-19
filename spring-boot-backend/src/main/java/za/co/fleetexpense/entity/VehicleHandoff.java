package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import za.co.fleetexpense.enums.HandoffState;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "vehicle_handoff")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VehicleHandoff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_assignment_id")
    private VehicleAssignment oldAssignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_assignment_id")
    private VehicleAssignment newAssignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "initiated_by_id", nullable = false)
    private User initiatedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 40)
    @Builder.Default
    private HandoffState state = HandoffState.PENDING_HANDOFF_INITIATED;

    @Column(name = "manager_approved_at")
    private Instant managerApprovedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by_id")
    private User cancelledBy;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "override_reason", length = 500)
    private String overrideReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
