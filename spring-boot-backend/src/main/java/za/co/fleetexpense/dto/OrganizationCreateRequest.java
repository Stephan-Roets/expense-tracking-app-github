package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;

@Data
public class OrganizationCreateRequest {
    @NotBlank(message = "Organization name is required")
    private String name;

    @NotNull(message = "Organization mode is required")
    private OrganizationMode mode;

    private String taxNumber;
    private String vatNumber;
    private String address;
    private String city;
    private String postalCode;
    private String province;
    private String contactEmail;
    private String contactPhone;
    private String timeZone;
    private String currency;
    private TaxCalculationMethod defaultTaxCalculationMethod;
}
