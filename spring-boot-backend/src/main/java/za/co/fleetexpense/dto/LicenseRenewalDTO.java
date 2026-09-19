package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LicenseRenewalDTO {
    private String licenseType;
    private String licenseNumber;
    private String renewalDate;
    private String expiryDate;
    private String registrationAuthority;
    private String previousExpiryDate;
    private String newExpiryDate;
    private BigDecimal renewalFeeZar;
    private BigDecimal penaltiesZar;
    private BigDecimal arrearsZar;
    private String transactionNumber;
    private String renewalMethod;
    private Integer processingDays;
    private Integer odometerReading;
    private String issuingAuthority;
    private String notes;
}
