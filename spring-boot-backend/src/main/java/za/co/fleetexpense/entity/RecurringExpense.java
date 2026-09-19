package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import za.co.fleetexpense.entity.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "recurring_expenses", indexes = {
    @Index(name = "idx_recurring_expenses_organization", columnList = "organization_id"),
    @Index(name = "idx_recurring_expenses_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_recurring_expenses_user", columnList = "user_id"),
    @Index(name = "idx_recurring_expenses_category", columnList = "category"),
    @Index(name = "idx_recurring_expenses_active", columnList = "is_active,is_recurring")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExpenseCategory category;

    @Column(name = "amount_zar", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal amountZar = BigDecimal.ZERO;

    @Column(name = "vat_amount_zar", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal vatAmountZar = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "is_tax_deductible", nullable = false)
    @Builder.Default
    private Boolean isTaxDeductible = true;

    @Column(name = "odometer_reading")
    private Integer odometerReading;

    // Recurrence settings
    @Column(name = "is_recurring", nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;

    @Column(name = "recurrence_days")
    private String recurrenceDays; // Comma-separated: MON,TUE,WED,THU,FRI,SAT,SUN

    @Column(name = "recurrence_days_of_month")
    private String recurrenceDaysOfMonth; // Comma-separated: 1,15,30

    @Column(name = "recurrence_start_date", nullable = false)
    private LocalDate recurrenceStartDate;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate; // NULL for ongoing

    // Metadata
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
