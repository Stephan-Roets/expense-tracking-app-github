package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringTripCreateRequest {

    @NotNull(message = "Vehicle ID is required")
    private UUID vehicleId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    // Trip details
    @NotBlank(message = "Purpose is required")
    private String purpose;

    @NotBlank(message = "Start location is required")
    private String startLocation;

    @NotBlank(message = "End location is required")
    private String endLocation;

    private String routeDescription;
    private String customerClientName;
    private String reasonForTrip;

    // Time settings for sorting
    private String startTime; // HH:mm format

    private String endTime; // HH:mm format

    // Recurrence settings
    @NotNull(message = "Is recurring is required")
    @Builder.Default
    private Boolean isRecurring = false;

    private String recurrenceDays; // Comma-separated: MON,TUE,WED,THU,FRI,SAT,SUN

    private String recurrenceDaysOfMonth; // Comma-separated: 1,15,30

    private LocalDate recurrenceStartDate;

    private LocalDate recurrenceEndDate; // NULL for ongoing

    // Default costs
    @Builder.Default
    private BigDecimal defaultTollCostsZar = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal defaultParkingCostsZar = BigDecimal.ZERO;
}
