package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import za.co.fleetexpense.entity.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class RecurringExpenseCreateRequest {
    private UUID vehicleId;

    private UUID userId;

    @NotNull(message = "Category is required")
    private ExpenseCategory category;
    
    @NotNull(message = "Amount is required")
    private BigDecimal amountZar;
    
    private BigDecimal vatAmountZar;
    private String description;
    private String supplierName;
    private String invoiceNumber;
    private Boolean isTaxDeductible;
    private Integer odometerReading;
    
    private Boolean isRecurring;
    private String recurrenceDays;
    private String recurrenceDaysOfMonth;
    private LocalDate recurrenceStartDate;
    private LocalDate recurrenceEndDate;
}
