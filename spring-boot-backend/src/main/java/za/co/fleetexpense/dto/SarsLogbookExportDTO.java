package za.co.fleetexpense.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SarsLogbookExportDTO {

    // Vehicle Information
    private UUID vehicleId;
    private String vehicleRegistration;
    private String vehicleMake;
    private String vehicleModel;
    private Integer vehicleYear;

    // Tax Year Summary
    private Integer taxYear;
    private Integer openingOdometer;
    private Integer closingOdometer;
    private Integer totalKm;
    private Integer businessKm;
    private Integer privateKm;
    private BigDecimal businessPercentage;

    // Expense Summary
    private BigDecimal totalExpenses;
    private BigDecimal fuelExpenses;
    private BigDecimal maintenanceExpenses;
    private BigDecimal fixedExpenses;
    private BigDecimal deductibleExpenses;
    private String selectedCalculationMethod;
    private String deductionFormula;

    // Phase 1: Provisional Actual Costs estimate (not a final SARS deduction)
    private BigDecimal provisionalActualCostsEstimate;
    private String calculationMethodLabel;

    // Detailed Data
    private List<TripEntry> trips;
    private List<ExpenseEntry> expenses;
    private List<FuelLogEntry> fuelLogs;

    // Odometer Verification Images for SARS compliance
    private String openingOdometerImageUrl;
    private String closingOdometerImageUrl;

    // Metadata
    private String generatedAt;
    private String generatedBy;
    private String organizationName;

    // Nested DTOs for export rows
    @Data
    @Builder
    public static class TripEntry {
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer openingKm;
        private Integer closingKm;
        private Integer distanceKm;
        private String purpose;
        private String startLocation;
        private String destination;
        private String reasonForTrip;
        private String customerName;
        private BigDecimal tollCosts;
        private BigDecimal parkingCosts;
    }

    @Data
    @Builder
    public static class ExpenseEntry {
        private LocalDate date;
        private String category;
        private String description;
        private BigDecimal amount;
        private BigDecimal vatAmount;
        private Boolean taxDeductible;
        private String receiptImageUrl;
    }

    @Data
    @Builder
    public static class FuelLogEntry {
        private LocalDate date;
        private String fuelType;
        private BigDecimal liters;
        private BigDecimal pricePerLiter;
        private BigDecimal totalCost;
        private Integer odometerReading;
        private BigDecimal consumptionLPer100km;
        private String stationName;
    }
}
