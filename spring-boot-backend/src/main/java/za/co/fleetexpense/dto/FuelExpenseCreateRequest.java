package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Data;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.UUID;

/**
 * Combined DTO for creating a fuel expense from the frontend multipart form.
 * Contains both expense-level and fuel-log-level fields in a single payload.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FuelExpenseCreateRequest {

    // Expense-level fields
    private UUID vehicleId;
    private BigDecimal amountZar;
    private BigDecimal totalCost;
    private String description;

    private LocalDate expenseDate;

    /**
     * Accept 'date' key from frontend (ISO-8601 datetime or date string).
     */
    @JsonSetter("date")
    public void setDateFromIso(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return;
        try {
            this.expenseDate = OffsetDateTime.parse(dateStr).toLocalDate();
        } catch (DateTimeParseException e1) {
            try {
                this.expenseDate = LocalDate.parse(dateStr);
            } catch (DateTimeParseException e2) {
                this.expenseDate = LocalDate.now();
            }
        }
    }

    // Fuel log fields
    private FuelType fuelType;
    private BigDecimal liters;
    private BigDecimal pricePerLiter;
    private Boolean fullTank;
    private String stationName;
    private String stationLocation;
    private Integer odometerReading;
    private Boolean isBaselineFill;

    // GPS coordinates (optional)
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;
    private BigDecimal gpsAccuracyMeters;

    /**
     * Resolved amount: prefer explicit amountZar, fall back to totalCost, then calculate.
     */
    public BigDecimal getAmountZar() {
        if (amountZar != null) return amountZar;
        if (totalCost != null) return totalCost;
        if (liters != null && pricePerLiter != null) return liters.multiply(pricePerLiter);
        return BigDecimal.ZERO;
    }
}
