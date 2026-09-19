package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PersonalLicenseDTO {
    private String licenseType;
    private String licenseNumber;
    private String licenseCode;
    private String issueDate;
    private String expiryDate;
    private BigDecimal renewalFeeZar;
    private BigDecimal penaltiesZar;
    private String renewalMethod;
    private String issuingAuthority;
    private String notes;
}
