package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.enums.DistanceSource;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TaxYearSummaryDTO {

    private UUID id;
    private UUID organizationId;
    private UUID vehicleId;
    private String vehicleRegistration;
    private Integer taxYear;

    // SARS Required Kilometer Fields
    private Integer totalKm;
    private Integer businessKm;
    private Integer privateKm;
    private BigDecimal businessPercentage;

    // Phase 1: Additional distance tracking
    private Integer unclassifiedLoggedKm;
    private Integer unloggedKm;
    private DistanceSource distanceSource;

    // SARS Required Odometer Fields
    private Integer openingOdometer;
    private Integer closingOdometer;

    // Phase 1: Classified expense totals (in cents for precision)
    private Long qualifyingCurrentExpenseCents;
    private Long capitalOrAllowanceReviewCents;
    private Long personalOrNonQualifyingExpenseCents;
    private Long uncategorizedExpenseCents;

    // Legacy expense breakdown (for backward compatibility, will be deprecated)
    private BigDecimal totalExpensesZar;
    private BigDecimal fuelExpensesZar;
    private BigDecimal maintenanceExpensesZar;
    private BigDecimal fixedExpensesZar;

    // Phase 1: Data quality warnings
    private List<String> dataQualityWarnings;

    // Company Car Fringe Benefit indicator
    private Boolean isCompanyProvidedVehicle;

    // Metadata
    private OffsetDateTime lastCalculated;
    private OffsetDateTime createdAt;
}
