package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class VehicleTrackingDTO {
    private String providerName;
    private String subscriptionType;
    private BigDecimal monthlyFeeZar;
    private String subscriptionStartDate;
    private String subscriptionEndDate;
    private String deviceSerialNumber;
    private String deviceType;
    private String installationDate;
    private BigDecimal installationFeeZar;
    private Integer contractDurationMonths;
    private Boolean recoveryIncluded;
    private Integer odometerReading;
    private String odometerReadingDate;
    private String appLoginEmail;
    private String supportPhone;
    private String features;
    private String notes;
}
