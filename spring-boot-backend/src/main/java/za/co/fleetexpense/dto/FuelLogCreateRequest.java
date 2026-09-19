package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class FuelLogCreateRequest {
    @NotNull(message = "Expense ID is required")
    private UUID expenseId;

    @NotNull(message = "Vehicle ID is required")
    private UUID vehicleId;

    @NotNull(message = "Fuel type is required")
    private FuelType fuelType;

    @NotNull(message = "Liters is required")
    @Positive(message = "Liters must be positive")
    private BigDecimal liters;

    @NotNull(message = "Price per liter is required")
    @Positive(message = "Price per liter must be positive")
    private BigDecimal pricePerLiter;

    private Boolean fullTank;
    private String stationName;
    private String stationLocation;

    @NotNull(message = "Odometer reading is required")
    @Positive(message = "Odometer must be positive")
    private Integer odometerReading;

    private Boolean isBaselineFill;

    // Optional GPS coordinates for fuel purchase location
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;
    private BigDecimal gpsAccuracyMeters;
}
