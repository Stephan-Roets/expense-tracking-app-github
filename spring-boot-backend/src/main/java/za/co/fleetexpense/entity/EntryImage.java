package za.co.fleetexpense.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.EntryType;
import za.co.fleetexpense.entity.enums.ImageType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "entry_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntryImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    @JsonIgnore
    private Organization organization;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, columnDefinition = "entry_type")
    private EntryType entryType;

    @Column(name = "entry_id", nullable = false)
    private UUID entryId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "image_key")
    private String imageKey;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "image_type", nullable = false, columnDefinition = "image_type")
    private ImageType imageType;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "description")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id")
    @JsonIgnore
    private User uploadedByUser;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private Boolean isLocked = false;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by_user_id")
    @JsonIgnore
    private User lockedByUser;

    @Column(name = "locked_reason")
    private String lockedReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
