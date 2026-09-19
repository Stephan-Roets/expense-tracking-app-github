package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FuelLogDTO {
    private UUID id;
    private UUID expenseId;
    private UUID vehicleId;
    private String vehicleRegistration;
    private FuelType fuelType;
    private BigDecimal liters;
    private BigDecimal pricePerLiter;
    private BigDecimal totalCost;
    private Boolean fullTank;
    private String stationName;
    private String stationLocation;
    private Integer previousOdometer;
    private Integer currentOdometer;
    private Integer kmSinceLastFill;
    private BigDecimal efficiencyKmPerLiter;
    private BigDecimal consumptionLPer100km;
    private Boolean isBaselineFill;
    private String consumptionNotes;
    private OffsetDateTime consumptionCalculatedAt;

    // GPS coordinates for fuel purchase location (optional)
    private BigDecimal gpsLatitude;
    private BigDecimal gpsLongitude;
    private BigDecimal gpsAccuracyMeters;

    private OffsetDateTime createdAt;
}
