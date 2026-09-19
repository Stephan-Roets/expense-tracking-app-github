package za.co.fleetexpense.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class VehicleFuelConsumptionStatsDTO {

    private UUID id;
    private UUID organizationId;
    private UUID vehicleId;
    private String vehicleRegistration;
    private String vehicleName;

    // Statistics
    private Integer totalFuelLogs;
    private Integer totalFullTankFills;
    private BigDecimal totalLiters;
    private Integer totalDistanceKm;
    private BigDecimal totalFuelCostZar;

    // Consumption metrics
    private BigDecimal averageConsumptionLPer100km;
    private BigDecimal bestConsumptionLPer100km;
    private BigDecimal worstConsumptionLPer100km;
    private BigDecimal recentAverageConsumptionLPer100km;

    // Last fill info
    private Integer lastFillOdometer;
    private LocalDate lastFillDate;
    private Boolean lastFillFullTank;

    // Metadata
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
