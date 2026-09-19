package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.OdometerReadingType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "odometer_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OdometerVerification {

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

    @Column(name = "tax_year", nullable = false)
    private Integer taxYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "reading_type", nullable = false)
    private OdometerReadingType readingType;

    @Column(name = "odometer_value", nullable = false)
    private Integer odometerValue;

    @Column(name = "image_url_avif")
    private String imageUrlAvif;

    @Column(name = "image_key")
    private String imageKey;

    @Column(name = "captured_at", nullable = false)
    private OffsetDateTime capturedAt;

    @Column(name = "gps_latitude", precision = 10, scale = 8)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", precision = 11, scale = 8)
    private BigDecimal gpsLongitude;

    @Column(name = "gps_accuracy_meters", precision = 8, scale = 2)
    private BigDecimal gpsAccuracyMeters;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "ip_address", insertable = false, updatable = false)
    private String ipAddress;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private Boolean isLocked = false;

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
}
