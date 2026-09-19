package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import za.co.fleetexpense.enums.ExportReportFormat;
import za.co.fleetexpense.enums.ExportReportType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "export_reports", indexes = {
    @Index(name = "idx_export_reports_organization", columnList = "organization_id"),
    @Index(name = "idx_export_reports_status", columnList = "status"),
    @Index(name = "idx_export_reports_type", columnList = "report_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExportReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id", nullable = false)
    private User requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false)
    private ExportReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_format", nullable = false)
    private ExportReportFormat reportFormat;

    @Column(name = "date_from")
    private OffsetDateTime dateFrom;

    @Column(name = "date_to")
    private OffsetDateTime dateTo;

    @Column(name = "vehicle_ids")
    private String vehicleIds; // JSON array of UUIDs

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "download_url")
    private String downloadUrl;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, PROCESSING, COMPLETED, FAILED

    @Column(name = "error_message")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}
