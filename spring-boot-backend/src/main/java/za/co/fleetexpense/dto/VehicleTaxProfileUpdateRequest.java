package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.co.fleetexpense.entity.enums.CompensationType;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.entity.enums.TaxpayerType;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleTaxProfileUpdateRequest {
    private Long vehicleCostCents;

    private LocalDate datePlacedInBusinessUse;

    private Boolean taxpayerVatRegistered;

    private TaxpayerType taxpayerType;

    private CompensationType compensationType;

    private String fuelBorneBy;

    private String maintenanceBorneBy;

    private Boolean coveredByMaintenancePlan;

    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    private TaxCalculationMethod defaultCalculationMethod;

    private Boolean isCompanyProvidedVehicle;
}
