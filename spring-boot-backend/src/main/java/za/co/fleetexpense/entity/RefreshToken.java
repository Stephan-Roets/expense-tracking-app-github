package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Transient
    private String plainToken;

    public OffsetDateTime getExpiryDate() {
        return expiresAt;
    }

    public void setExpiryDate(OffsetDateTime expiryDate) {
        this.expiresAt = expiryDate;
    }

    public Boolean getIsRevoked() {
        return revokedAt != null;
    }

    public void setIsRevoked(boolean revoked) {
        if (revoked && revokedAt == null) {
            revokedAt = OffsetDateTime.now();
        } else if (!revoked) {
            revokedAt = null;
        }
    }

    public Boolean getIsUsed() {
        return false;
    }

    public void setIsUsed(boolean used) {
    }
}
