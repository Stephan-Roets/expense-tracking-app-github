package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EtollPaymentDTO {
    private String accountNumber;
    private String tagSerialNumber;
    private String vehicleRegistration;
    private String paymentMethod;
    private String tollRoutes;
    private Integer totalGantries;
    private String periodStartDate;
    private String periodEndDate;
    private BigDecimal totalAmountZar;
    private BigDecimal vatAmountZar;
    private String referenceNumber;
    private String notes;
}
