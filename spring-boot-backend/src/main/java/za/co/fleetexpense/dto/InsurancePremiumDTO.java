package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InsurancePremiumDTO {
    private String insurerName;
    private String policyNumber;
    private String policyType;
    private BigDecimal premiumAmountZar;
    private BigDecimal monthlyPremiumZar;
    private String coverageStartDate;
    private String coverageEndDate;
    private BigDecimal excessAmountZar;
    private Integer odometerReading;
    private String odometerReadingDate;
    private String brokerName;
    private String brokerPhone;
    private String claimPhoneNumber;
    private String coverDetails;
    private String notes;
}
