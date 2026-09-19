package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxCalculationResult {
    private String method; // "COST_SCALE", "PRESCRIBED_RATE", "TRAVEL_ALLOWANCE"
    private BigDecimal totalDeductionCents;
    private BigDecimal fixedCostCents;
    private BigDecimal fuelCostCents;
    private BigDecimal maintenanceCostCents;
    private BigDecimal businessShare; // 0.0 to 1.0
    private Integer businessUseDays;
    private Integer daysInTaxYear;
    private String bracketDescription;
    private Boolean eligible;
    private String ineligibilityReason;
    private Map<String, Object> breakdown;
}
