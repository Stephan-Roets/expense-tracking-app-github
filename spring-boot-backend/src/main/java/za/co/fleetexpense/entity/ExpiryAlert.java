package za.co.fleetexpense.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "expiry_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpiryAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    @JsonIgnore
    private Organization organization;

    @Column(name = "item_type", nullable = false)
    private String itemType;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(name = "related_id")
    private UUID relatedId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "item_description")
    private String itemDescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "days_until_expiry")
    private Integer daysUntilExpiry;

    @Column(name = "expiry_status")
    private String expiryStatus;

    @Column(name = "is_dismissed", nullable = false)
    @Builder.Default
    private Boolean isDismissed = false;

    @Column(name = "dismissed_at")
    private OffsetDateTime dismissedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dismissed_by_user_id")
    private User dismissedByUser;

    @Column(name = "last_notified_at")
    private OffsetDateTime lastNotifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
