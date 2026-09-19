package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TripDTO {
    private UUID id;
    private UUID organizationId;
    private UUID vehicleId;
    private String vehicleRegistration;
    private UUID userId;
    private String driverName;

    // SARS Logbook Requirements
    private LocalDate tripDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer startOdometer;
    private Integer endOdometer;
    private Integer distanceKm;  // Calculated

    // Purpose and Justification
    private TripPurpose purpose;
    private String startLocation;
    private String endLocation;
    private String routeDescription;
    private String customerClientName;
    private String reasonForTrip;

    // Costs
    private BigDecimal tollCostsZar;
    private BigDecimal parkingCostsZar;
    private BigDecimal totalTripCosts;  // Calculated

    // SARS Tax Fields
    private Boolean isBusinessTrip;
    private Integer businessKm;  // Same as distanceKm if BUSINESS, 0 if PRIVATE
    private Integer privateKm;   // 0 if BUSINESS, distanceKm if PRIVATE

    // Locking
    private Boolean isLocked;
    private OffsetDateTime lockedAt;
    private String lockedReason;
    private UUID lockedByUserId;

    // Metadata
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
