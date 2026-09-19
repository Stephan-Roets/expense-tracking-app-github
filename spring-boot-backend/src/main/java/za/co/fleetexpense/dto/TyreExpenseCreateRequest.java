package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class TyreExpenseCreateRequest {
    @NotNull(message = "Vehicle ID is required")
    private UUID vehicleId;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amountZar;

    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    @NotBlank(message = "Supplier name is required")
    private String supplierName;

    private String description;
    private String invoiceNumber;

    // Tyre specific fields
    @NotBlank(message = "Tyre brand is required")
    private String brand;

    private String model;

    @NotBlank(message = "Tyre size is required")
    private String size;

    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    private Integer quantity;

    private String position;

    @NotNull(message = "Purchase odometer is required")
    private Integer purchaseOdometer;

    private BigDecimal treadDepthMm;
    private Integer expectedLifespanKm;
    private Integer rotationIntervalKm;
    private Integer warrantyKm;
    private String notes;
}
