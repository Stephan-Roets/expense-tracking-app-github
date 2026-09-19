package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxCalculationRequest {
    @NotNull
    private UUID vehicleId;
    
    @NotNull
    private UUID taxProfileId;
    
    @NotNull
    private LocalDate taxYearStart;
    
    @NotNull
    private LocalDate taxYearEnd;
    
    @NotNull
    private BigDecimal businessKm;
    
    @NotNull
    private BigDecimal totalKm;
}
