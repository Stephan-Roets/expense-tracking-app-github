package za.co.fleetexpense.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringTripDTO {

    private UUID id;
    private UUID organizationId;
    private UUID vehicleId;
    private String vehicleName;
    private UUID userId;
    private String userName;

    // Trip details
    private String purpose;
    private String startLocation;
    private String endLocation;
    private String routeDescription;
    private String customerClientName;
    private String reasonForTrip;

    // Time settings for sorting
    private String startTime; // HH:mm format

    private String endTime; // HH:mm format

    // Recurrence settings
    private Boolean isRecurring;
    private String recurrenceDays; // Comma-separated: MON,TUE,WED,THU,FRI,SAT,SUN
    private LocalDate recurrenceStartDate;
    private LocalDate recurrenceEndDate;

    // Default costs
    private BigDecimal defaultTollCostsZar;
    private BigDecimal defaultParkingCostsZar;

    // Metadata
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
