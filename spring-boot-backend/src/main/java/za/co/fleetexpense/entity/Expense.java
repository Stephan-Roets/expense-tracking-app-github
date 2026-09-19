package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;
import za.co.fleetexpense.entity.enums.ExpenseCategory;
import za.co.fleetexpense.enums.TaxExpenseClassification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Expense entity representing all vehicle-related expenses.
 *
 * Supports multiple expense categories including:
 * - Fuel logs
 * - Mechanic services
 * - Maintenance top-ups
 * - Tyres
 * - Insurance premiums
 * - Vehicle tracking
 * - E-tolls
 * - License renewals
 * - Personal licenses (driver's license, ID card, PDP)
 * - Roadworthy certificates
 * - Other fixed expenses
 */
@Entity
@SQLRestriction("is_deleted = false")
@Table(name = "expenses", indexes = {
    @Index(name = "idx_expenses_organization", columnList = "organization_id"),
    @Index(name = "idx_expenses_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_expenses_user", columnList = "user_id"),
    @Index(name = "idx_expenses_category", columnList = "category"),
    @Index(name = "idx_expenses_date", columnList = "expense_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = true)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExpenseCategory category;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "amount_zar", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal amountZar = BigDecimal.ZERO;

    @Column(name = "vat_amount_zar", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal vatAmountZar = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "receipt_image_url", columnDefinition = "TEXT")
    private String receiptImageUrl;

    @Column(name = "receipt_image_key")
    private String receiptImageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_expense_classification", nullable = false)
    @Builder.Default
    private TaxExpenseClassification taxExpenseClassification = TaxExpenseClassification.UNCATEGORIZED;

    // Phase 1: VAT-related fields (nullable because historical VAT treatment is unknown)
    @Column(name = "amount_includes_vat")
    private Boolean amountIncludesVat;

    @Column(name = "vat_amount_cents")
    private Long vatAmountCents;

    @Column(name = "net_amount_cents")
    private Long netAmountCents;

    @Column(name = "odometer_reading")
    private Integer odometerReading;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "is_tax_deductible", nullable = false)
    @Builder.Default
    private Boolean isTaxDeductible = true;

    // Lock fields for audit trail
    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private Boolean isLocked = false;

    /** Soft-deleted entries stay available for odometer calibration and audit history. */
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by_user_id")
    private User lockedByUser;

    @Column(name = "locked_reason", columnDefinition = "TEXT")
    private String lockedReason;

    @Column(name = "extra_fields", columnDefinition = "TEXT")
    private String extraFields;

    // Timestamps
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // One-to-one relationships with expense detail tables
    @OneToOne(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private FuelLog fuelLog;

    @OneToOne(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private CarWash carWash;

    @OneToOne(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private MechanicService mechanicService;

    @OneToOne(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private MaintenanceTopup maintenanceTopup;

    @OneToOne(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private Tyre tyre;

    // Helper method to calculate total with VAT
    public BigDecimal getTotalWithVat() {
        return amountZar.add(vatAmountZar);
    }
}
