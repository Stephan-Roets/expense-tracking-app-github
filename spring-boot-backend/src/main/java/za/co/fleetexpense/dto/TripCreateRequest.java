package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class TripCreateRequest {

    @NotNull(message = "Vehicle ID is required")
    private UUID vehicleId;

    @NotNull(message = "Trip date is required")
    private LocalDate tripDate;

    private LocalTime startTime;
    private LocalTime endTime;

    @NotNull(message = "Start odometer is required")
    private Integer startOdometer;

    @NotNull(message = "End odometer is required")
    private Integer endOdometer;

    @NotNull(message = "Trip purpose is required")
    private TripPurpose purpose;

    @NotBlank(message = "Start location is required")
    private String startLocation;

    @NotBlank(message = "End location is required")
    private String endLocation;

    private String routeDescription;
    private String customerClientName;
    private String reasonForTrip;

    private BigDecimal tollCostsZar;
    private BigDecimal parkingCostsZar;
}
