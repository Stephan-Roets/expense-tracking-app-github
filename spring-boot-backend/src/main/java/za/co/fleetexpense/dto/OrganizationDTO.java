package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrganizationDTO {
    private UUID id;
    private String name;
    private OrganizationMode mode;
    private String taxNumber;
    private String vatNumber;
    private String address;
    private String city;
    private String postalCode;
    private String province;
    private String contactEmail;
    private String contactPhone;
    private String logoUrl;
    private String timeZone;
    private String currency;
    private Boolean conditionReportEnabled;
    private Boolean odometerConfirmationEnabled;
    private TaxCalculationMethod defaultTaxCalculationMethod;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
