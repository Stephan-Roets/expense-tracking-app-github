package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TyrePurchaseDTO {
    private String brand;
    private String model;
    private String size;
    private Integer quantity;
    private String position;
    private Integer purchaseOdometer;
    private BigDecimal treadDepthMm;
    private Integer expectedLifespanKm;
    private Integer warrantyKm;
    private String supplier;
    private String notes;
    private Boolean enableRotationTracking;
    private String drivetrainType;
}
