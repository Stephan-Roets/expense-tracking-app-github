package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Phase 9: DTO for SARS-specific tax submission export
 * Formatted specifically for SARS eFiling upload requirements
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SarsSubmissionExportDTO {
    // Taxpayer Information
    private String taxpayerName;
    private String taxpayerIdNumber;
    private String taxReferenceNumber;
    private String vatNumber; // Optional, if VAT registered

    // Vehicle Details
    private String vehicleRegistration;
    private String vehicleMake;
    private String vehicleModel;
    private Integer vehicleYear;
    private BigDecimal vehicleCostZar;

    // Tax Year Information
    private Integer taxYear;
    private LocalDate taxYearStart; // March 1st
    private LocalDate taxYearEnd; // February 28th/29th

    // Odometer Readings (from vehicle tax profile)
    private Integer march1stPhotoOdometer;
    private Integer feb28thPhotoOdometer;

    // Distance Summary
    private BigDecimal totalKm;
    private BigDecimal businessKm;
    private BigDecimal privateKm;
    private BigDecimal businessPercentage;

    // Tax Calculation
    private String calculationMethod; // ACTUAL_COSTS, SARS_COST_SCALE, SIMPLIFIED_REIMBURSIVE
    private BigDecimal taxDeductionZar;
    private String calculationMethodDescription;

    // Company Car / Fringe Benefit
    private Boolean isCompanyProvidedVehicle;
    private String fringeBenefitDescription;

    // Data Quality
    private Boolean hasOdometerDrift;
    private List<String> dataQualityWarnings;
    private Boolean isValidForSubmission;

    // Supporting Documentation
    private String supportingDocumentsReference;
    private String notes;
}
