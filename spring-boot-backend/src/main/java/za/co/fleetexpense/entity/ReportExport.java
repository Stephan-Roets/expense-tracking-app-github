package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import za.co.fleetexpense.entity.enums.ExportFormat;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.enums.ReportExportStatus;
import za.co.fleetexpense.enums.ReportExportType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_export", indexes = {
    @Index(name = "idx_report_export_org", columnList = "organization_id"),
    @Index(name = "idx_report_export_status", columnList = "status"),
    @Index(name = "idx_report_export_type", columnList = "report_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportExport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id", nullable = false)
    private User requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_type", nullable = false, length = 30)
    private ReportExportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 10)
    private ExportFormat format;

    @Column(name = "date_from")
    private OffsetDateTime dateFrom;

    @Column(name = "date_to")
    private OffsetDateTime dateTo;

    // Tax calculation specific fields
    @Column(name = "vehicle_id")
    private UUID vehicleId;

    @Column(name = "tax_year")
    private Integer taxYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "calculation_method")
    private TaxCalculationMethod calculationMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ReportExportStatus status = ReportExportStatus.PENDING;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
