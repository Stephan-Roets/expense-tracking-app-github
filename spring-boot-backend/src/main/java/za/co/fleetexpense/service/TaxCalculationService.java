package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import za.co.fleetexpense.dto.TaxCalculationResult;
import za.co.fleetexpense.entity.SarsCostScaleBracket;
import za.co.fleetexpense.entity.SarsPrescribedRate;
import za.co.fleetexpense.entity.VehicleTaxProfile;
import za.co.fleetexpense.entity.enums.CompensationType;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.entity.enums.TaxpayerType;
import za.co.fleetexpense.repository.SarsCostScaleBracketRepository;
import za.co.fleetexpense.repository.SarsPrescribedRateRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaxCalculationService {

    private final SarsCostScaleBracketRepository costScaleBracketRepository;
    private final SarsPrescribedRateRepository prescribedRateRepository;
    private final VehicleTaxProfileRepository taxProfileRepository;

    /**
     * Calculate tax deduction using Actual Costs method.
     * Formula: qualifyingCurrentExpenseCents × businessShare
     * Sole proprietors add wear-and-tear: claimYears = clamp(yearsToEnd,0,5) - clamp(yearsToStart,0,5)
     */
    public TaxCalculationResult calculateActualCosts(
            VehicleTaxProfile profile,
            BigDecimal qualifyingCurrentExpenseCents,
            BigDecimal businessKm,
            BigDecimal totalKm,
            LocalDate taxYearStart,
            LocalDate taxYearEnd) {

        // Calculate business share
        BigDecimal businessShare = totalKm.compareTo(BigDecimal.ZERO) > 0 
                ? businessKm.divide(totalKm, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Base deduction: qualifying expenses × businessShare
        BigDecimal totalDeduction = qualifyingCurrentExpenseCents.multiply(businessShare)
                .setScale(0, RoundingMode.HALF_UP);

        // Add wear-and-tear for sole proprietors
        BigDecimal wearAndTearCents = BigDecimal.ZERO;
        if (TaxpayerType.SOLE_PROPRIETOR.equals(profile.getTaxpayerType())) {
            // Calculate vehicle age in years at tax year start and end
            LocalDate purchaseDate = profile.getDatePlacedInBusinessUse();
            if (purchaseDate != null) {
                long yearsToStart = ChronoUnit.YEARS.between(purchaseDate, taxYearStart);
                long yearsToEnd = ChronoUnit.YEARS.between(purchaseDate, taxYearEnd);
                
                // Claim years decay: clamp to 0-5 range
                int claimYearsStart = (int) Math.max(0, Math.min(5, yearsToStart));
                int claimYearsEnd = (int) Math.max(0, Math.min(5, yearsToEnd));
                int claimYears = claimYearsEnd - claimYearsStart;
                
                // Wear-and-tear: 20% per year of vehicle cost (simplified)
                if (claimYears > 0) {
                    BigDecimal wearAndTearRate = BigDecimal.valueOf(0.20).multiply(BigDecimal.valueOf(claimYears));
                    wearAndTearCents = BigDecimal.valueOf(profile.getVehicleCostCents()).multiply(wearAndTearRate)
                            .multiply(businessShare)
                            .setScale(0, RoundingMode.HALF_UP);
                }
            }
        }

        totalDeduction = totalDeduction.add(wearAndTearCents);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("qualifyingCurrentExpenseCents", qualifyingCurrentExpenseCents);
        breakdown.put("businessShare", businessShare);
        breakdown.put("wearAndTearCents", wearAndTearCents);
        breakdown.put("taxpayerType", profile.getTaxpayerType());

        return TaxCalculationResult.builder()
                .method("ACTUAL_COSTS")
                .totalDeductionCents(totalDeduction)
                .fixedCostCents(wearAndTearCents)
                .fuelCostCents(BigDecimal.ZERO)
                .maintenanceCostCents(BigDecimal.ZERO)
                .businessShare(businessShare)
                .businessUseDays(null)
                .daysInTaxYear(null)
                .bracketDescription("Actual Costs Method")
                .eligible(true)
                .breakdown(breakdown)
                .build();
    }

    /**
     * Calculate tax deduction using SARS Cost Scale method.
     * Formula: fixedCost × (businessUseDays / daysInTaxYear) × businessShare
     * Fuel/maintenance: businessKm × rate / 10 (direct form)
     * Borne-by rules: EMPLOYEE only (exclude EMPLOYER and SHARED)
     */
    public TaxCalculationResult calculateSarsCostScale(
            VehicleTaxProfile profile,
            LocalDate taxYearStart,
            LocalDate taxYearEnd,
            BigDecimal businessKm,
            BigDecimal totalKm) {

        Integer taxYear = taxYearEnd.getYear();
        
        // Get bracket based on vehicle cost
        Optional<SarsCostScaleBracket> bracketOpt = costScaleBracketRepository
                .findByTaxYearAndVehicleValue(taxYear, profile.getVehicleCostCents());
        
        if (bracketOpt.isEmpty()) {
            return TaxCalculationResult.builder()
                    .method("SARS_COST_SCALE")
                    .eligible(false)
                    .ineligibilityReason("No cost scale bracket found for vehicle value")
                    .build();
        }
        
        SarsCostScaleBracket bracket = bracketOpt.get();
        
        // Calculate business use days within tax year
        LocalDate effectiveFrom = profile.getEffectiveFrom();
        LocalDate effectiveTo = profile.getEffectiveTo() != null ? profile.getEffectiveTo() : taxYearEnd;
        LocalDate datePlacedInBusinessUse = profile.getDatePlacedInBusinessUse();
        
        // Clamp to tax year boundaries and placement date
        // Approved formula: businessUseDays = days from max(taxYearStart, effectiveFrom, datePlacedInBusinessUse) to taxYearEnd
        LocalDate profileStart = effectiveFrom.isBefore(taxYearStart) ? taxYearStart : effectiveFrom;
        if (datePlacedInBusinessUse != null && datePlacedInBusinessUse.isAfter(profileStart)) {
            profileStart = datePlacedInBusinessUse;
        }
        LocalDate profileEnd = effectiveTo.isAfter(taxYearEnd) ? taxYearEnd : effectiveTo;
        
        long businessUseDays = ChronoUnit.DAYS.between(profileStart, profileEnd) + 1;
        long daysInTaxYear = computeDaysInTaxYear(taxYearStart, taxYearEnd);  // Calls helper, not inline computation
        
        // Calculate business share
        BigDecimal businessShare = totalKm.compareTo(BigDecimal.ZERO) > 0 
                ? businessKm.divide(totalKm, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        
        // Apply borne-by rules: EMPLOYEE only
        BigDecimal fixedCost = BigDecimal.valueOf(bracket.getFixedCostCents());
        
        // Direct form: businessKm × fuelTenthsCentsPerKm / 10
        BigDecimal fuelCost = BigDecimal.ZERO;
        if ("EMPLOYEE".equalsIgnoreCase(profile.getFuelBorneBy())) {
            fuelCost = BigDecimal.valueOf(bracket.getFuelCostTenthsCentsPerKm())
                    .multiply(businessKm)
                    .divide(BigDecimal.TEN, 0, RoundingMode.HALF_UP);
        }
        
        // Direct form: businessKm × maintenanceTenthsCentsPerKm / 10
        BigDecimal maintenanceCost = BigDecimal.ZERO;
        if ("EMPLOYEE".equalsIgnoreCase(profile.getMaintenanceBorneBy()) && 
            !profile.getCoveredByMaintenancePlan()) {
            maintenanceCost = BigDecimal.valueOf(bracket.getMaintenanceCostTenthsCentsPerKm())
                    .multiply(businessKm)
                    .divide(BigDecimal.TEN, 0, RoundingMode.HALF_UP);
        }
        
        // Approved formula: fixedCost × (businessUseDays / daysInTaxYear) × businessShare
        BigDecimal dayProRatedFixedCost = fixedCost.multiply(
                BigDecimal.valueOf(businessUseDays).divide(BigDecimal.valueOf(daysInTaxYear), 4, RoundingMode.HALF_UP)
        );
        
        BigDecimal totalDeduction = dayProRatedFixedCost.multiply(businessShare)
                .add(fuelCost)
                .add(maintenanceCost)
                .setScale(0, RoundingMode.HALF_UP);
        
        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("bracketIndex", bracket.getBracketIndex());
        breakdown.put("minVehicleValue", bracket.getMinVehicleValueCents());
        breakdown.put("maxVehicleValue", bracket.getMaxVehicleValueCents());
        breakdown.put("rawFixedCost", bracket.getFixedCostCents());
        breakdown.put("rawFuelCostPerKm", bracket.getFuelCostTenthsCentsPerKm());
        breakdown.put("rawMaintenanceCostPerKm", bracket.getMaintenanceCostTenthsCentsPerKm());
        breakdown.put("fuelBorneBy", profile.getFuelBorneBy());
        breakdown.put("maintenanceBorneBy", profile.getMaintenanceBorneBy());
        breakdown.put("coveredByMaintenancePlan", profile.getCoveredByMaintenancePlan());
        
        return TaxCalculationResult.builder()
                .method("SARS_COST_SCALE")
                .totalDeductionCents(totalDeduction)
                .fixedCostCents(dayProRatedFixedCost.multiply(businessShare).setScale(0, RoundingMode.HALF_UP))
                .fuelCostCents(fuelCost.setScale(0, RoundingMode.HALF_UP))
                .maintenanceCostCents(maintenanceCost.setScale(0, RoundingMode.HALF_UP))
                .businessShare(businessShare)
                .businessUseDays((int) businessUseDays)
                .daysInTaxYear((int) daysInTaxYear)
                .bracketDescription(bracket.getSourceName())
                .eligible(true)
                .breakdown(breakdown)
                .build();
    }

    /**
     * Calculate tax deduction using Simplified Reimbursive method.
     * Formula: prescribed rate × business km
     */
    public TaxCalculationResult calculateSimplifiedReimbursive(
            VehicleTaxProfile profile,
            LocalDate taxYearStart,
            LocalDate taxYearEnd,
            BigDecimal businessKm) {

        Integer taxYear = taxYearEnd.getYear();
        
        Optional<SarsPrescribedRate> rateOpt = prescribedRateRepository
                .findByTaxYear(taxYear);
        
        if (rateOpt.isEmpty()) {
            return TaxCalculationResult.builder()
                    .method("SIMPLIFIED_REIMBURSIVE")
                    .eligible(false)
                    .ineligibilityReason("No prescribed rate found for tax year")
                    .build();
        }
        
        SarsPrescribedRate rate = rateOpt.get();
        
        // Simplified reimbursive: rate per km × business km
        BigDecimal totalDeduction = BigDecimal.valueOf(rate.getRateCentsPerKm())
                .multiply(businessKm)
                .setScale(0, RoundingMode.HALF_UP);
        
        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("rateCentsPerKm", rate.getRateCentsPerKm());
        breakdown.put("businessKm", businessKm);
        
        return TaxCalculationResult.builder()
                .method("SIMPLIFIED_REIMBURSIVE")
                .totalDeductionCents(totalDeduction)
                .fixedCostCents(BigDecimal.ZERO)
                .fuelCostCents(BigDecimal.ZERO)
                .maintenanceCostCents(BigDecimal.ZERO)
                .businessShare(BigDecimal.ONE)
                .businessUseDays(null)
                .daysInTaxYear(null)
                .bracketDescription(rate.getSourceName())
                .eligible(true)
                .breakdown(breakdown)
                .build();
    }

    /**
     * Check eligibility based on eligibility matrix.
     * 
     * ACTUAL_COSTS:      EMPLOYEE+ALLOWANCE ✓ | EMPLOYEE+REIMB ✗ | SOLE_PROP ✓(+W&T) | COMPANY ✓
     * SARS_COST_SCALE:   EMPLOYEE+ALLOWANCE ✓ | SOLE_PROP+REIMB ✓
     * SIMPLIFIED_REIMB:  EMPLOYEE+REIMB ✓ | SOLE_PROP+REIMB ✓ (AA rate)
     */
    public boolean isEligibleForMethod(
            TaxCalculationMethod method,
            VehicleTaxProfile profile,
            BigDecimal businessKm,
            BigDecimal totalKm) {
        
        TaxpayerType taxpayerType = profile.getTaxpayerType();
        CompensationType compensationType = profile.getCompensationType();
        
        switch (method) {
            case ACTUAL_COSTS:
                // EMPLOYEE+ALLOWANCE, SOLE_PROPRIETOR, COMPANY
                if (TaxpayerType.EMPLOYEE.equals(taxpayerType)) {
                    return CompensationType.TRAVEL_ALLOWANCE.equals(compensationType);
                } else if (TaxpayerType.SOLE_PROPRIETOR.equals(taxpayerType)) {
                    return true; // + wear-and-tear
                } else if (TaxpayerType.COMPANY.equals(taxpayerType)) {
                    return true;
                }
                return false;
                
            case SARS_COST_SCALE:
                // Employee allowance or sole proprietor reimbursement.
                return (TaxpayerType.EMPLOYEE.equals(taxpayerType) &&
                        CompensationType.TRAVEL_ALLOWANCE.equals(compensationType)) ||
                       (TaxpayerType.SOLE_PROPRIETOR.equals(taxpayerType) &&
                        CompensationType.REIMBURSEMENT.equals(compensationType));
                
            case SIMPLIFIED_REIMBURSIVE:
                // Employee or sole proprietor reimbursement using AA prescribed rate.
                return (TaxpayerType.EMPLOYEE.equals(taxpayerType) ||
                        TaxpayerType.SOLE_PROPRIETOR.equals(taxpayerType)) &&
                       CompensationType.REIMBURSEMENT.equals(compensationType);
                
            default:
                return false;
        }
    }
    
    /**
     * Get ineligibility reason for a method.
     */
    public String getIneligibilityReason(
            TaxCalculationMethod method,
            VehicleTaxProfile profile) {
        
        TaxpayerType taxpayerType = profile.getTaxpayerType();
        CompensationType compensationType = profile.getCompensationType();
        
        switch (method) {
            case ACTUAL_COSTS:
                if (TaxpayerType.EMPLOYEE.equals(taxpayerType)) {
                    if (!CompensationType.TRAVEL_ALLOWANCE.equals(compensationType)) {
                        return "Actual Costs only eligible for EMPLOYEE+ALLOWANCE, SOLE_PROPRIETOR, or COMPANY";
                    }
                }
                return "Actual Costs not eligible for this taxpayer type/compensation combination";
                
            case SARS_COST_SCALE:
                boolean employeeAllowance = TaxpayerType.EMPLOYEE.equals(taxpayerType) &&
                        CompensationType.TRAVEL_ALLOWANCE.equals(compensationType);
                boolean soleProprietorReimbursement = TaxpayerType.SOLE_PROPRIETOR.equals(taxpayerType) &&
                        CompensationType.REIMBURSEMENT.equals(compensationType);
                if (!employeeAllowance && !soleProprietorReimbursement) {
                    return "SARS Cost Scale requires EMPLOYEE+ALLOWANCE or SOLE_PROPRIETOR+REIMBURSEMENT";
                }
                return "SARS Cost Scale not eligible for this taxpayer type/compensation combination";
                
            case SIMPLIFIED_REIMBURSIVE:
                if (!(TaxpayerType.EMPLOYEE.equals(taxpayerType) || TaxpayerType.SOLE_PROPRIETOR.equals(taxpayerType)) ||
                    !CompensationType.REIMBURSEMENT.equals(compensationType)) {
                    return "Simplified Reimbursive requires EMPLOYEE+REIMBURSEMENT or SOLE_PROPRIETOR+REIMBURSEMENT";
                }
                return "Simplified Reimbursive not eligible for this taxpayer type/compensation combination";
                
            default:
                return "Unknown calculation method";
        }
    }
    
    /**
     * Compute the number of days in a tax year (inclusive).
     * Tax year boundaries are inclusive: March 1 to February 28/29.
     */
    public int computeDaysInTaxYear(LocalDate taxYearStart, LocalDate taxYearEnd) {
        return (int) ChronoUnit.DAYS.between(taxYearStart, taxYearEnd) + 1;
    }
    
    /**
     * Find the active tax profile for a vehicle in a given tax year.
     * Uses server-side selection (off-by-one fix and straddle rule).
     */
    public VehicleTaxProfile findProfileForTaxYear(UUID vehicleId, Integer taxYear) {
        LocalDate taxYearStart = LocalDate.of(taxYear, 3, 1); // SARS tax year starts March 1
        LocalDate taxYearEnd = LocalDate.of(taxYear + 1, 2, 28); // Ends Feb 28/29
        
        // Find profile that is active during the tax year
        List<VehicleTaxProfile> profiles = taxProfileRepository.findByVehicleId(vehicleId);
        
        for (VehicleTaxProfile profile : profiles) {
            LocalDate effectiveFrom = profile.getEffectiveFrom();
            LocalDate effectiveTo = profile.getEffectiveTo();
            
            // Check if profile overlaps with tax year
            boolean overlaps = !effectiveFrom.isAfter(taxYearEnd) && 
                              (effectiveTo == null || !effectiveTo.isBefore(taxYearStart));
            
            if (overlaps) {
                return profile;
            }
        }
        
        return null;
    }
}
