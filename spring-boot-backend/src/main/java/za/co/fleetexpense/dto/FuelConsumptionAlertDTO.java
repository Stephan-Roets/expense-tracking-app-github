package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FuelConsumptionAlertDTO {
    private UUID vehicleId;
    private BigDecimal averageConsumptionLPer100km;
    private BigDecimal recentAverageConsumptionLPer100km;
    private BigDecimal degradationPercent;
    private String severity;
    private String message;
}
