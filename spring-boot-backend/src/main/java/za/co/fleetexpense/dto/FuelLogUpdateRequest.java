package za.co.fleetexpense.dto;

import jakarta.validation.constraints.Positive;
import lombok.Data;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;

@Data
public class FuelLogUpdateRequest {
    private FuelType fuelType;

    @Positive(message = "Liters must be positive")
    private BigDecimal liters;

    @Positive(message = "Price per liter must be positive")
    private BigDecimal pricePerLiter;

    private Boolean fullTank;
    private String stationName;
    private String stationLocation;

    @Positive(message = "Odometer must be positive")
    private Integer odometerReading;

    private String consumptionNotes;

    // Optional GPS coordinates for fuel purchase location
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;
    private BigDecimal gpsAccuracyMeters;
}
