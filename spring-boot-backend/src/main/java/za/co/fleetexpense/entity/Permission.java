package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "permissions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission_type", "permission_key", "user_role"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organization_id", nullable = true)
    private UUID organizationId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "permission_type", nullable = false, length = 50)
    private String permissionType;

    @Column(name = "permission_key", nullable = false, length = 100)
    private String permissionKey;

    @Column(name = "user_role", nullable = false, length = 50)
    private String userRole;

    @Column(name = "is_allowed", nullable = false)
    @Builder.Default
    private Boolean isAllowed = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
