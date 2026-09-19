package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_assistants",
       uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "assistant_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAssistant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "assistant_id", nullable = false)
    private UUID assistantId;

    @Column(name = "assistant_role", nullable = false, length = 50)
    private String assistantRole;

    @Column(name = "assigned_date_range_start")
    private LocalDate assignedDateRangeStart;

    @Column(name = "assigned_date_range_end")
    private LocalDate assignedDateRangeEnd;

    @Column(name = "assigned_vehicle_id")
    private UUID assignedVehicleId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "removed_at")
    private OffsetDateTime removedAt;

    @Column(name = "removed_by")
    private UUID removedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
