package za.co.fleetexpense.dto;

import jakarta.validation.constraints.Positive;
import lombok.Data;
import za.co.fleetexpense.entity.enums.ExpenseCategory;
import za.co.fleetexpense.enums.TaxExpenseClassification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExpenseUpdateRequest {
    private ExpenseCategory category;

    @Positive(message = "Amount must be positive")
    private BigDecimal amountZar;

    private LocalDate expenseDate;
    private String supplierName;
    private String description;
    private String invoiceNumber;
    private Boolean isRecurring;
    private Boolean isTaxDeductible;
    private Integer odometerReading;

    // Phase 1: Tax expense classification (optional - will be derived from category if not provided)
    private TaxExpenseClassification taxExpenseClassification;
}
