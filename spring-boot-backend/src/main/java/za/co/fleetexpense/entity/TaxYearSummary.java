package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tax_year_summaries", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"vehicle_id", "tax_year"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxYearSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(name = "tax_year", nullable = false)
    private Integer taxYear;

    @Column(name = "total_km", nullable = false)
    @Builder.Default
    private Integer totalKm = 0;

    @Column(name = "business_km", nullable = false)
    @Builder.Default
    private Integer businessKm = 0;

    @Column(name = "private_km", nullable = false)
    @Builder.Default
    private Integer privateKm = 0;

    @Column(name = "business_percentage", precision = 5, scale = 2, insertable = false, updatable = false)
    private BigDecimal businessPercentage;

    @Column(name = "total_expenses_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalExpensesZar = BigDecimal.ZERO;

    @Column(name = "fuel_expenses_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal fuelExpensesZar = BigDecimal.ZERO;

    @Column(name = "maintenance_expenses_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal maintenanceExpensesZar = BigDecimal.ZERO;

    @Column(name = "fixed_expenses_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal fixedExpensesZar = BigDecimal.ZERO;

    @Column(name = "opening_odometer")
    private Integer openingOdometer;

    @Column(name = "closing_odometer")
    private Integer closingOdometer;

    @Column(name = "last_calculated", nullable = false)
    private OffsetDateTime lastCalculated;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
