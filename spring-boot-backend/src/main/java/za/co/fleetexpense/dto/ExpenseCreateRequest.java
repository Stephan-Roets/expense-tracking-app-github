package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import za.co.fleetexpense.entity.enums.ExpenseCategory;
import za.co.fleetexpense.enums.TaxExpenseClassification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExpenseCreateRequest {
    private UUID vehicleId;

    @NotNull(message = "Category is required")
    private ExpenseCategory category;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amountZar;

    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    private String description;
    private String invoiceNumber;
    private Integer odometerReading;
    private Boolean isRecurring;
    private Boolean isTaxDeductible;
    private String extraFields;

    // Phase 1: Tax expense classification (optional - will be derived from category if not provided)
    private TaxExpenseClassification taxExpenseClassification;
}
