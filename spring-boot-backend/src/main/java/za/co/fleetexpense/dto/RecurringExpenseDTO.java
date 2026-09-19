package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecurringExpenseDTO {
    private UUID id;
    private UUID organizationId;
    private UUID organizationName;
    private UUID vehicleId;
    private String vehicleRegistration;
    private UUID userId;
    private String userName;
    private ExpenseCategory category;
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
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
