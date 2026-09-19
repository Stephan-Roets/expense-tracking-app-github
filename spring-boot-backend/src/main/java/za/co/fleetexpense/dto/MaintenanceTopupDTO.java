package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MaintenanceTopupDTO {
    private String itemType;
    private String shopName;
    private BigDecimal priceZar;
    private String purchaseDate;
    private String brand;
    private String itemBrand;
    private Integer itemQuantity;
    private String notes;
}
