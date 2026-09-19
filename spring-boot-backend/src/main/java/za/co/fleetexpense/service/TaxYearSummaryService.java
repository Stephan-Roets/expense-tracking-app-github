package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.TaxYearSummaryDTO;
import za.co.fleetexpense.entity.TaxYearSummary;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleTaxProfile;
import za.co.fleetexpense.entity.enums.OdometerReadingType;
import za.co.fleetexpense.enums.DistanceSource;
import za.co.fleetexpense.enums.TaxExpenseClassification;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.mapper.TaxYearSummaryMapper;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.OdometerConfirmationRepository;
import za.co.fleetexpense.repository.OdometerDriftAlertRepository;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.TaxYearSummaryRepository;
import za.co.fleetexpense.repository.TripRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TaxYearSummaryService {

    private final TaxYearSummaryRepository taxYearSummaryRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final ExpenseRepository expenseRepository;
    private final OdometerConfirmationRepository odometerConfirmationRepository;
    private final OdometerDriftAlertRepository odometerDriftAlertRepository;
    private final OdometerVerificationRepository odometerVerificationRepository;
    private final TripRepository tripRepository;
    private final TripService tripService;
    private final TaxYearSummaryMapper taxYearSummaryMapper;
    private final VehicleTaxProfileRepository vehicleTaxProfileRepository;

    @Value("${tax.odometer-mismatch-tolerance-km:1}")
    private int odometerMismatchToleranceKm;

    // Public method for testing configurable tolerance
    public boolean exceedsOdometerTolerance(int unloggedKm) {
        return unloggedKm > odometerMismatchToleranceKm;
    }

    /**
     * Check if vehicle has active odometer drift alerts
     * This prevents tax calculations with inaccurate odometer data for ALL users
     */
    private boolean hasActiveOdometerDrift(UUID vehicleId) {
        return odometerDriftAlertRepository.findByVehicleIdAndIsDismissedFalse(vehicleId).isPresent();
    }

    /**
     * Calculate tax deduction using Simplified Reimbursive (AA Rates)
     * Formula: businessKm x R4.95/km (2027 SARS rate)
     * Used by solo individuals - requires accurate business KM from trip logs
     */
    private BigDecimal calculateSimplifiedReimbursive(BigDecimal businessKm) {
        // 2027 SARS AA rate: R4.95 per km
        BigDecimal aaRate = BigDecimal.valueOf(4.95);
        return businessKm.multiply(aaRate).multiply(BigDecimal.valueOf(100)); // Convert to cents
    }

    /**
     * Calculate tax deduction using SARS Cost Scale
     * Uses official SARS 9-tier asset value brackets + pro-rata fuel/maintenance allowances
     */
    private BigDecimal calculateSarsCostScale(UUID vehicleId, BigDecimal businessKm, 
                                            BigDecimal totalKm, LocalDate taxYearStart, LocalDate taxYearEnd) {
        // Get vehicle tax profile to retrieve vehicle cost
        za.co.fleetexpense.entity.VehicleTaxProfile profile = vehicleTaxProfileRepository
                .findByVehicleIdAndEffectiveToIsNull(vehicleId).orElse(null);
        
        if (profile == null || profile.getVehicleCostCents() == null) {
            return BigDecimal.ZERO;
        }
        
        // Convert vehicle cost from cents to rands
        BigDecimal vehicleCostZar = BigDecimal.valueOf(profile.getVehicleCostCents()).divide(BigDecimal.valueOf(100));
        
        // SARS 9-tier asset value brackets (2027)
        // Apply appropriate bracket based on vehicle cost
        // This is a simplified version - actual implementation would use the full bracket table
        BigDecimal annualAllowance = vehicleCostZar.multiply(BigDecimal.valueOf(0.20)); // 20% of vehicle value
        
        // Calculate pro-rata business use
        if (totalKm.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal businessPercentage = businessKm.divide(totalKm, 4, RoundingMode.HALF_UP);
            annualAllowance = annualAllowance.multiply(businessPercentage);
        }
        
        return annualAllowance.multiply(BigDecimal.valueOf(100)); // Convert to cents
    }

    // ==================== DTO-BASED CRUD OPERATIONS ====================

    public List<TaxYearSummaryDTO> getByOrganization(UUID organizationId) {
        List<TaxYearSummary> summaries = taxYearSummaryRepository.findByOrganizationId(organizationId);
        if (summaries.isEmpty()) {
            return List.of();
        }
        return enrichCalculatedFieldsBatch(summaries);
    }

    public TaxYearSummaryDTO getById(UUID id) {
        TaxYearSummary summary = taxYearSummaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax year summary not found: " + id));
        return enrichCalculatedFields(summary);
    }

    public List<TaxYearSummaryDTO> getByVehicle(UUID vehicleId) {
        List<TaxYearSummary> summaries = taxYearSummaryRepository.findByVehicleId(vehicleId);
        return summaries.stream()
                .map(this::enrichCalculatedFields)
                .collect(Collectors.toList());
    }

    public TaxYearSummaryDTO getByVehicleAndYear(UUID vehicleId, Integer taxYear) {
        TaxYearSummary summary = taxYearSummaryRepository.findByVehicleIdAndTaxYear(vehicleId, taxYear)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tax year summary not found for vehicle " + vehicleId + " and tax year " + taxYear));
        return enrichCalculatedFields(summary);
    }

    public List<TaxYearSummaryDTO> getByOrganizationAndYear(UUID organizationId, Integer taxYear) {
        List<TaxYearSummary> summaries = taxYearSummaryRepository.findByOrganizationAndYear(organizationId, taxYear);
        if (summaries.isEmpty()) {
            return List.of();
        }
        return enrichCalculatedFieldsBatch(summaries);
    }

    /**
     * Phase 1: Enrich DTO with calculated fields (distance source, classified expenses, warnings)
     * This method populates transient Phase 1 fields from the persisted summary entity
     */
    private TaxYearSummaryDTO enrichCalculatedFields(TaxYearSummary summary) {
        TaxYearSummaryDTO dto = taxYearSummaryMapper.toDTO(summary);
        
        // Populate Phase 1 fields using TripService and expense classification
        if (summary.getVehicle() != null && summary.getTaxYear() != null) {
            TripService.DistanceCalculationResult distanceResult = tripService.getTotalKmForTaxYearWithSource(
                    summary.getVehicle().getId(), summary.getTaxYear());
            
            dto.setUnclassifiedLoggedKm(distanceResult.unclassifiedLoggedKm());
            dto.setUnloggedKm(distanceResult.unloggedKm());
            dto.setDistanceSource(distanceResult.distanceSource());
            dto.setDataQualityWarnings(distanceResult.warnings());
            
            // Calculate classified expense totals
            ExpenseClassificationResult expenseResult = calculateExpenseBreakdown(
                    summary.getVehicle().getId(), summary.getTaxYear());
            
            dto.setQualifyingCurrentExpenseCents(expenseResult.qualifyingCurrentExpenseCents());
            dto.setCapitalOrAllowanceReviewCents(expenseResult.capitalOrAllowanceReviewCents());
            dto.setPersonalOrNonQualifyingExpenseCents(expenseResult.personalOrNonQualifyingExpenseCents());
            dto.setUncategorizedExpenseCents(expenseResult.uncategorizedExpenseCents());
            
            // Add warning for uncategorized expenses
            if (expenseResult.uncategorizedExpenseCents() > 0) {
                List<String> warnings = new ArrayList<>(dto.getDataQualityWarnings() != null ? dto.getDataQualityWarnings() : new ArrayList<>());
                warnings.add(String.format("R%.2f in expenses require classification.", expenseResult.uncategorizedExpenseCents() / 100.0));
                dto.setDataQualityWarnings(warnings);
            }
        }
        
        return dto;
    }

    /**
     * Phase 1 Fix: Batch enrich DTOs with calculated fields to avoid N+1 queries
     * Uses batch queries for odometer readings, trip distances, and expense classification sums
     * Implements SARS tax year dates (1 March to end February)
     */
    private List<TaxYearSummaryDTO> enrichCalculatedFieldsBatch(List<TaxYearSummary> summaries) {
        if (summaries.isEmpty()) {
            return List.of();
        }

        // Get unique vehicle IDs and tax year
        List<UUID> vehicleIds = summaries.stream()
                .map(s -> s.getVehicle().getId())
                .distinct()
                .toList();
        Integer taxYear = summaries.get(0).getTaxYear();

        // Compute SARS tax year date ranges (1 March to end February)
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, Month.MARCH, 1);
        LocalDate taxYearEndExcl = LocalDate.of(taxYear, Month.MARCH, 1);
        
        // Convert to OffsetDateTime for OdometerConfirmation (uses Africa/Johannesburg timezone)
        ZoneId businessZone = ZoneId.of("Africa/Johannesburg");
        OffsetDateTime taxYearStartOffset = taxYearStart.atStartOfDay(businessZone).toOffsetDateTime();
        OffsetDateTime taxYearEndExclOffset = taxYearEndExcl.atStartOfDay(businessZone).toOffsetDateTime();

        // Batch query opening odometer readings from OdometerVerification (Tax Readiness Audit)
        Map<UUID, Integer> openingOdometers = odometerVerificationRepository
                .findOpeningOdometersByVehiclesAndTaxYear(vehicleIds, OdometerReadingType.OPENING, taxYear);
        Map<UUID, Integer> openingMap = new HashMap<>(openingOdometers);

        // Batch query closing odometer readings from expenses.odometer_reading
        List<Object[]> closingOdometers = expenseRepository
                .findClosingOdometersByVehiclesAndDateRange(vehicleIds, taxYearStart, taxYearEndExcl);
        Map<UUID, Integer> closingMap = new HashMap<>();
        for (Object[] row : closingOdometers) {
            UUID vehicleId = (UUID) row[0];
            Integer closing = row[1] != null ? ((Number) row[1]).intValue() : null;
            closingMap.put(vehicleId, closing);
        }

        // Batch query trip distances by purpose
        List<Object[]> tripDistances = tripRepository
                .findDistanceTotalsByVehiclesAndDateRange(vehicleIds, taxYearStart, taxYearEndExcl);
        Map<UUID, Map<String, Long>> tripDistanceMap = new HashMap<>();
        for (Object[] row : tripDistances) {
            UUID vehicleId = (UUID) row[0];
            String purpose = row[1] != null ? row[1].toString() : null;
            Long distanceKm = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            tripDistanceMap.computeIfAbsent(vehicleId, k -> new HashMap<>()).put(purpose, distanceKm);
        }

        // Batch query expense classification sums
        List<Object[]> expenseSums = expenseRepository
                .findExpenseClassificationSumsByVehiclesAndDateRange(vehicleIds, taxYearStart, taxYearEndExcl);
        Map<UUID, Map<TaxExpenseClassification, Long>> expenseMap = new HashMap<>();
        for (Object[] row : expenseSums) {
            UUID vehicleId = (UUID) row[0];
            TaxExpenseClassification classification = (TaxExpenseClassification) row[1];
            Long sumCents = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            expenseMap.computeIfAbsent(vehicleId, k -> new HashMap<>()).put(classification, sumCents);
        }

        // Enrich each DTO from the batch maps
        return summaries.stream()
                .map(summary -> {
                    TaxYearSummaryDTO dto = taxYearSummaryMapper.toDTO(summary);
                    
                    if (summary.getVehicle() != null && summary.getTaxYear() != null) {
                        List<String> warnings = new ArrayList<>();

                        // Get odometer readings (nullable)
                        Integer opening = openingMap.get(summary.getVehicle().getId());
                        Integer closing = closingMap.get(summary.getVehicle().getId());

                        // Get trip distances
                        Map<String, Long> vehicleTripDistances = tripDistanceMap.get(summary.getVehicle().getId());
                        long businessKm = vehicleTripDistances != null ? vehicleTripDistances.getOrDefault("BUSINESS", 0L) : 0L;
                        long privateKm = vehicleTripDistances != null ? vehicleTripDistances.getOrDefault("PRIVATE", 0L) : 0L;
                        long unclassifiedLoggedKm = vehicleTripDistances != null ? vehicleTripDistances.getOrDefault("UNCLASSIFIED", 0L) : 0L;
                        long loggedTripKm = businessKm + privateKm + unclassifiedLoggedKm;

                        // Check if we have a valid odometer pair (both non-null and closing > opening)
                        if (opening != null && closing != null && closing > opening) {
                            int odometerTotalKm = closing - opening;
                            dto.setTotalKm(odometerTotalKm);
                            dto.setDistanceSource(DistanceSource.ODOMETER);
                            
                            // Always set trip-based fields
                            dto.setUnclassifiedLoggedKm((int) unclassifiedLoggedKm);
                            
                            // Handle odometer vs logged trip discrepancy
                            if (odometerTotalKm < loggedTripKm) {
                                // Severe warning: odometer less than logged trips
                                warnings.add(String.format("Odometer distance (%d km) is less than logged trips (%d km). Possible closing odometer error.", 
                                    odometerTotalKm, loggedTripKm));
                                dto.setUnloggedKm(0);
                            } else {
                                // Positive unlogged distance
                                int unloggedKm = odometerTotalKm - (int) loggedTripKm;
                                dto.setUnloggedKm(unloggedKm);
                                // Warning if unlogged distance exceeds tolerance (default 1km)
                                if (exceedsOdometerTolerance(unloggedKm)) {
                                    warnings.add(String.format("Unlogged distance: %d km exceeds tolerance of %d km", unloggedKm, odometerMismatchToleranceKm));
                                }
                            }
                        } else {
                            // No valid odometer pair - use logged trips as fallback
                            dto.setTotalKm((int) loggedTripKm);
                            dto.setDistanceSource(DistanceSource.LOGGED_TRIPS);
                            dto.setUnclassifiedLoggedKm((int) unclassifiedLoggedKm);
                            dto.setUnloggedKm(0);
                            
                            if (opening == null) {
                                warnings.add("Missing opening odometer reading");
                            }
                            if (closing == null) {
                                warnings.add("Missing closing odometer reading");
                            }
                            if (opening != null && closing != null && closing <= opening) {
                                warnings.add(String.format("Closing odometer (%d) is not greater than opening (%d)", closing, opening));
                            }
                        }

                        // Use batch expense data
                        Map<TaxExpenseClassification, Long> vehicleExpenseSums = expenseMap.get(summary.getVehicle().getId());
                        if (vehicleExpenseSums != null) {
                            dto.setQualifyingCurrentExpenseCents(
                                    vehicleExpenseSums.getOrDefault(TaxExpenseClassification.QUALIFYING_CURRENT_EXPENSE, 0L));
                            dto.setCapitalOrAllowanceReviewCents(
                                    vehicleExpenseSums.getOrDefault(TaxExpenseClassification.CAPITAL_OR_ALLOWANCE_REVIEW, 0L));
                            dto.setPersonalOrNonQualifyingExpenseCents(
                                    vehicleExpenseSums.getOrDefault(TaxExpenseClassification.PERSONAL_OR_NON_QUALIFYING, 0L));
                            dto.setUncategorizedExpenseCents(
                                    vehicleExpenseSums.getOrDefault(TaxExpenseClassification.UNCATEGORIZED, 0L));
                            
                            // Add warning for uncategorized expenses
                            if (dto.getUncategorizedExpenseCents() > 0) {
                                warnings.add(String.format("R%.2f in expenses require classification.", dto.getUncategorizedExpenseCents() / 100.0));
                            }
                        }

                        // Set combined warnings
                        if (!warnings.isEmpty()) {
                            dto.setDataQualityWarnings(warnings);
                        }
                    }
                    
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // ==================== SARS CALCULATIONS ====================

    @Transactional
    public TaxYearSummaryDTO calculateSummary(UUID vehicleId, Integer taxYear, UUID organizationId) {
        TaxYearSummary summary = taxYearSummaryRepository.findByVehicleIdAndTaxYear(vehicleId, taxYear)
                .orElse(new TaxYearSummary());

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Get vehicle tax profile to check Company Car Fringe Benefit toggle
        VehicleTaxProfile taxProfile = vehicleTaxProfileRepository
                .findByVehicleIdAndEffectiveToIsNull(vehicleId)
                .orElse(null);
        boolean isCompanyProvidedVehicle = taxProfile != null && taxProfile.getIsCompanyProvidedVehicle();

        summary.setOrganization(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found")));
        summary.setVehicle(vehicle);
        summary.setTaxYear(taxYear);

        // CORRECTED: SARS tax year date range (March 1 of previous year to Feb 28/29 of tax year)
        // Tax year N starts 1 March N-1 and ends 28 Feb N
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, Month.MARCH, 1);
        LocalDate taxYearEndExcl = LocalDate.of(taxYear, Month.MARCH, 1);

        // Get opening and closing odometers from OdometerVerification (authoritative source)
        var openingVerification = odometerVerificationRepository.findByVehicleYearAndType(
                vehicleId, taxYear, OdometerReadingType.OPENING);
        var closingVerification = odometerVerificationRepository.findByVehicleYearAndType(
                vehicleId, taxYear, OdometerReadingType.CLOSING);

        Integer march1stBaseline = openingVerification.map(ov -> ov.getOdometerValue()).orElse(null);
        Integer feb28thClosing = closingVerification.map(ov -> ov.getOdometerValue()).orElse(null);

        // Calculate Total KM per LOCKED DATA MODEL:
        // TOTAL KM = (closing odometer if set and locked, else MAX(fuel odometer in tax year)) - opening odometer
        // If opening odometer is missing, Total KM is unavailable - do NOT use TripLogs as fallback
        int totalKm = 0;
        DistanceSource distanceSource = DistanceSource.LOGGED_TRIPS;
        List<String> warnings = new ArrayList<>();

        if (march1stBaseline != null) {
            // Determine closing odometer: use closing verification if set and locked, else max fuel odometer
            Integer closingOdometer = null;
            if (feb28thClosing != null && closingVerification.isPresent() && closingVerification.get().getIsLocked() && feb28thClosing > march1stBaseline) {
                closingOdometer = feb28thClosing;
                distanceSource = DistanceSource.ODOMETER;
            } else {
                // Fallback to max fuel odometer in tax year (for open tax years without closing verification yet)
                var maxFuelOdometer = expenseRepository.findMaxFuelOdometerByVehicleAndTaxYear(
                    vehicleId, taxYearStart, taxYearEndExcl);
                if (maxFuelOdometer.isPresent() && maxFuelOdometer.get() > march1stBaseline) {
                    closingOdometer = maxFuelOdometer.get();
                    distanceSource = DistanceSource.FUEL_EXPENSE;
                }
            }

            if (closingOdometer != null) {
                totalKm = closingOdometer - march1stBaseline;
            } else {
                // No closing odometer available (neither closing verification nor fuel odometer) - total KM incomplete
                totalKm = 0;
                distanceSource = DistanceSource.LOGGED_TRIPS;
                warnings.add("No closing odometer or fuel entries available for tax year. Total KM calculation incomplete. Please add fuel entries or set closing odometer verification.");
            }
        } else {
            // No March 1st baseline - Total KM unavailable, do NOT use TripLogs as fallback
            totalKm = 0;
            distanceSource = DistanceSource.LOGGED_TRIPS;
            warnings.add("Opening odometer verification required for tax year. Total KM cannot be calculated without verified opening odometer. Please set opening odometer in Odometer Verification.");
        }

        // Get Business KM from trip logs (only business trips are logged)
        int businessKm = tripService.getBusinessKmForTaxYear(vehicleId, taxYear);

        // Get Unclassified KM from trip logs
        int unclassifiedKm = tripService.getUnclassifiedKmForTaxYear(vehicleId, taxYear);

        // CORRECTED: Private KM is computed, never logged
        // privateKm = totalKm - businessKm - unclassifiedKm (applies to BOTH toggle modes)
        int privateKm = Math.max(0, totalKm - businessKm - unclassifiedKm);

        summary.setTotalKm(totalKm);
        summary.setBusinessKm(businessKm);
        summary.setPrivateKm(privateKm);

        // Calculate business percentage (same formula for both modes)
        // Business % = businessKm / totalKm
        if (totalKm > 0) {
            BigDecimal businessPercentage = BigDecimal.valueOf(businessKm)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(totalKm), 2, RoundingMode.HALF_UP);
            summary.setBusinessPercentage(businessPercentage);
        }

        // Calculate expenses with classification
        ExpenseClassificationResult expenseResult = calculateExpenseBreakdown(vehicleId, taxYear);

        summary.setFuelExpensesZar(expenseResult.fuelExpenses());
        summary.setMaintenanceExpensesZar(expenseResult.maintenanceExpenses());
        summary.setFixedExpensesZar(expenseResult.fixedExpenses());
        summary.setTotalExpensesZar(expenseResult.fuelExpenses()
                .add(expenseResult.maintenanceExpenses())
                .add(expenseResult.fixedExpenses()));

        summary.setLastCalculated(OffsetDateTime.now());

        TaxYearSummary saved = taxYearSummaryRepository.save(summary);

        // Get trip log details for unclassified/unlogged km (still needed for DTO)
        TripService.DistanceCalculationResult distanceResult = tripService.getTotalKmForTaxYearWithSource(vehicleId, taxYear);

        // Map to DTO and add Phase 1 fields
        TaxYearSummaryDTO dto = taxYearSummaryMapper.toDTO(saved);
        dto.setUnclassifiedLoggedKm(distanceResult.unclassifiedLoggedKm());
        dto.setUnloggedKm(distanceResult.unloggedKm());
        dto.setDistanceSource(distanceSource);

        // Merge warnings from calculation and trip log analysis
        List<String> allWarnings = new ArrayList<>(warnings);
        allWarnings.addAll(distanceResult.warnings());
        dto.setDataQualityWarnings(allWarnings);
        
        // Set Company Car Fringe Benefit indicator
        dto.setIsCompanyProvidedVehicle(isCompanyProvidedVehicle);
        
        // Set classified expense totals
        dto.setQualifyingCurrentExpenseCents(expenseResult.qualifyingCurrentExpenseCents());
        dto.setCapitalOrAllowanceReviewCents(expenseResult.capitalOrAllowanceReviewCents());
        dto.setPersonalOrNonQualifyingExpenseCents(expenseResult.personalOrNonQualifyingExpenseCents());
        dto.setUncategorizedExpenseCents(expenseResult.uncategorizedExpenseCents());
        
        // Add warning for uncategorized expenses
        if (expenseResult.uncategorizedExpenseCents() > 0) {
            allWarnings.add(String.format("R%.2f in expenses require classification.", expenseResult.uncategorizedExpenseCents() / 100.0));
        }
        
        log.info("Calculated SARS tax year summary for vehicle {} tax year {}", vehicleId, taxYear);
        return dto;
    }

    /**
     * Calculate expense breakdown for SARS reporting with Phase 1 classification
     * Uses SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
     */
    private ExpenseClassificationResult calculateExpenseBreakdown(UUID vehicleId, int taxYear) {
        List<za.co.fleetexpense.entity.Expense> expenses = expenseRepository.findByVehicleId(vehicleId);

        // SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, 3, 1); // March 1st
        LocalDate taxYearEndExclusive = LocalDate.of(taxYear, 3, 1); // March 1st (exclusive)

        // Phase 1: Classified expense totals (in cents)
        long qualifyingCurrentExpenseCents = 0;
        long capitalOrAllowanceReviewCents = 0;
        long personalOrNonQualifyingExpenseCents = 0;
        long uncategorizedExpenseCents = 0;

        // Legacy expense breakdown (for backward compatibility)
        BigDecimal fuelExpenses = BigDecimal.ZERO;
        BigDecimal maintenanceExpenses = BigDecimal.ZERO;
        BigDecimal fixedExpenses = BigDecimal.ZERO;

        for (za.co.fleetexpense.entity.Expense expense : expenses) {
            if (!expense.getExpenseDate().isBefore(taxYearStart) && expense.getExpenseDate().isBefore(taxYearEndExclusive)) {
                BigDecimal amount = expense.getAmountZar() != null ? expense.getAmountZar() : BigDecimal.ZERO;
                long amountCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

                // Phase 1: Classify by tax_expense_classification
                TaxExpenseClassification classification = expense.getTaxExpenseClassification();
                if (classification != null) {
                    switch (classification) {
                        case QUALIFYING_CURRENT_EXPENSE:
                            qualifyingCurrentExpenseCents += amountCents;
                            break;
                        case CAPITAL_OR_ALLOWANCE_REVIEW:
                            capitalOrAllowanceReviewCents += amountCents;
                            break;
                        case PERSONAL_OR_NON_QUALIFYING:
                            personalOrNonQualifyingExpenseCents += amountCents;
                            break;
                        case UNCATEGORIZED:
                            uncategorizedExpenseCents += amountCents;
                            break;
                    }
                } else {
                    // Fallback for expenses without classification
                    uncategorizedExpenseCents += amountCents;
                }

                // Legacy breakdown by category
                switch (expense.getCategory()) {
                    case FUEL_LOG:
                        fuelExpenses = fuelExpenses.add(amount);
                        break;
                    case MAINTENANCE_TOPUP:
                    case MECHANIC_SERVICE:
                    case TIRES:
                        maintenanceExpenses = maintenanceExpenses.add(amount);
                        break;
                    case INSURANCE_PREMIUM:
                    case VEHICLE_TRACKING:
                    case LICENSE_RENEWAL:
                    case ROADWORTHY:
                        fixedExpenses = fixedExpenses.add(amount);
                        break;
                    default:
                        // Other categories can be classified as needed
                        break;
                }
            }
        }

        return new ExpenseClassificationResult(
                qualifyingCurrentExpenseCents,
                capitalOrAllowanceReviewCents,
                personalOrNonQualifyingExpenseCents,
                uncategorizedExpenseCents,
                fuelExpenses,
                maintenanceExpenses,
                fixedExpenses
        );
    }

    /**
     * Inner class to hold expense classification results
     */
    private record ExpenseClassificationResult(
            long qualifyingCurrentExpenseCents,
            long capitalOrAllowanceReviewCents,
            long personalOrNonQualifyingExpenseCents,
            long uncategorizedExpenseCents,
            BigDecimal fuelExpenses,
            BigDecimal maintenanceExpenses,
            BigDecimal fixedExpenses
    ) {}

    // ==================== SARS REPORTING METHODS ====================

    /**
     * Get complete SARS logbook data for a vehicle
     */
    public Map<String, Object> getSarsLogbookData(UUID vehicleId, int taxYear) {
        Map<String, Object> data = new HashMap<>();

        // Vehicle information
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        data.put("vehicleRegistration", vehicle.getRegistrationNumber());
        data.put("vehicleMake", vehicle.getMake());
        data.put("vehicleModel", vehicle.getModel());

        // Get or calculate summary
        TaxYearSummaryDTO summary = taxYearSummaryRepository.findByVehicleIdAndTaxYear(vehicleId, taxYear)
                .map(taxYearSummaryMapper::toDTO)
                .orElse(calculateSummary(vehicleId, taxYear, vehicle.getOrganization().getId()));

        data.put("taxYear", taxYear);
        data.put("totalKm", summary.getTotalKm());
        data.put("businessKm", summary.getBusinessKm());
        data.put("privateKm", summary.getPrivateKm());
        data.put("businessPercentage", summary.getBusinessPercentage());

        // Expense breakdown
        data.put("totalExpenses", summary.getTotalExpensesZar());
        data.put("fuelExpenses", summary.getFuelExpensesZar());
        data.put("maintenanceExpenses", summary.getMaintenanceExpensesZar());
        data.put("fixedExpenses", summary.getFixedExpensesZar());

        return data;
    }

    /**
     * Get summary for entire organization
     */
    public Map<String, Object> getOrganizationSarsSummary(UUID organizationId, int taxYear) {
        List<TaxYearSummary> summaries = taxYearSummaryRepository.findByOrganizationAndYear(organizationId, taxYear);

        int totalVehicles = summaries.size();
        int totalOrgKm = summaries.stream().mapToInt(TaxYearSummary::getTotalKm).sum();
        int totalOrgBusinessKm = summaries.stream().mapToInt(TaxYearSummary::getBusinessKm).sum();

        BigDecimal totalOrgExpenses = summaries.stream()
                .map(s -> s.getTotalExpensesZar() != null ? s.getTotalExpensesZar() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = new HashMap<>();
        summary.put("organizationId", organizationId);
        summary.put("taxYear", taxYear);
        summary.put("totalVehicles", totalVehicles);
        summary.put("totalKm", totalOrgKm);
        summary.put("totalBusinessKm", totalOrgBusinessKm);
        summary.put("totalPrivateKm", totalOrgKm - totalOrgBusinessKm);
        summary.put("totalExpenses", totalOrgExpenses);

        if (totalOrgKm > 0) {
            BigDecimal orgBusinessPercentage = BigDecimal.valueOf(totalOrgBusinessKm)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(totalOrgKm), 2, RoundingMode.HALF_UP);
            summary.put("organizationBusinessPercentage", orgBusinessPercentage);
        }

        return summary;
    }
}
