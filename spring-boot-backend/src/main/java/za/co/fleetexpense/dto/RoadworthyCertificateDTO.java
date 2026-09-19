package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RoadworthyCertificateDTO {
    private String testingStationName;
    private String testingStationAddress;
    private String testingStationPhone;
    private String testDate;
    private String testResult;
    private BigDecimal testFeeZar;
    private BigDecimal retestFeeZar;
    private String certificateExpiryDate;
    private String expiryDate;
    private String certificateNumber;
    private String inspectorName;
    private Integer vehicleOdometer;
    private String failureReasons;
    private String conditionsApplied;
    private String notes;
}
