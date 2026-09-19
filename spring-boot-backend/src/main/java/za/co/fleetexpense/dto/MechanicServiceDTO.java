package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MechanicServiceDTO {
    private String serviceType;
    private String workshopName;
    private String workDescription;
    private BigDecimal totalCostZar;
    private BigDecimal laborCostZar;
    private BigDecimal partsCostZar;
    private String invoiceNumber;
    private String serviceDate;
    private String mechanicName;
    private String partsUsed;
    private String glassProvider;
    private BigDecimal excessAmountZar;
    private String notes;
}
