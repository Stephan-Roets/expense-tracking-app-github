package za.co.fleetexpense.dto;

import jakarta.validation.constraints.Positive;
import lombok.Data;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class TripUpdateRequest {

    private UUID vehicleId;
    private LocalDate tripDate;
    private LocalTime startTime;
    private LocalTime endTime;

    @Positive(message = "Odometer readings must be positive")
    private Integer startOdometer;

    @Positive(message = "Odometer readings must be positive")
    private Integer endOdometer;

    private TripPurpose purpose;
    private String startLocation;
    private String endLocation;
    private String routeDescription;
    private String customerClientName;
    private String reasonForTrip;

    private BigDecimal tollCostsZar;
    private BigDecimal parkingCostsZar;
}
