package za.co.fleetexpense.dto;

import lombok.Data;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;

@Data
public class UpdateOrganizationRequest {
    private String name;
    private String taxNumber;
    private String vatNumber;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String province;
    private String postalCode;
    private String phone;
    private Boolean conditionReportEnabled;
    private Boolean odometerConfirmationEnabled;
    private TaxCalculationMethod defaultTaxCalculationMethod;
}
