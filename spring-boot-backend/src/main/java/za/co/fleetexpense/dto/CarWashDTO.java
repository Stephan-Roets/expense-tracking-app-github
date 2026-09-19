package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CarWashDTO {
    private String washType;
    private BigDecimal costZar;
    private String washName;
    private String washLocation;
    private String washDate;
    private String notes;
}
