package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tax_calculation_snapshot", indexes = {
    @Index(name = "idx_snapshot_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_snapshot_organization", columnList = "organization_id"),
    @Index(name = "idx_snapshot_tax_year", columnList = "tax_year"),
    @Index(name = "idx_snapshot_export", columnList = "export_id"),
    @Index(name = "idx_snapshot_calculated_at", columnList = "calculated_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxCalculationSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "tax_year", nullable = false)
    private Integer taxYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "selected_method", nullable = false, length = 30)
    private za.co.fleetexpense.entity.enums.TaxCalculationMethod selectedMethod;

    @Column(name = "inputs_json", nullable = false)
    private String inputsJson;

    @Column(name = "result_json", nullable = false)
    private String resultJson;

    @Column(name = "sars_rate_snapshot_json", nullable = false)
    private String sarsRateSnapshotJson;

    @Column(name = "calculated_at", nullable = false)
    private OffsetDateTime calculatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "calculated_by_user_id", nullable = false)
    private User calculatedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "export_id", nullable = false)
    private ReportExport export;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
