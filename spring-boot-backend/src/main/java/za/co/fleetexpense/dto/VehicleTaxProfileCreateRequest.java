package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.co.fleetexpense.entity.enums.CompensationType;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.entity.enums.TaxpayerType;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleTaxProfileCreateRequest {
    @NotNull
    private UUID vehicleId;

    @NotNull
    private Long vehicleCostCents;

    @NotNull
    private LocalDate datePlacedInBusinessUse;

    @NotNull
    private Boolean taxpayerVatRegistered;

    @NotNull
    private TaxpayerType taxpayerType;

    @NotNull
    private CompensationType compensationType;

    @NotNull
    private String fuelBorneBy;

    @NotNull
    private String maintenanceBorneBy;

    @NotNull
    private Boolean coveredByMaintenancePlan;

    @NotNull
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    private TaxCalculationMethod defaultCalculationMethod;

    private Boolean isCompanyProvidedVehicle;
}
