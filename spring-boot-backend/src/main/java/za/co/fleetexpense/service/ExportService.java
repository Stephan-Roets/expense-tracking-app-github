package za.co.fleetexpense.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import za.co.fleetexpense.dto.*;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.FuelLog;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.Trip;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.enums.EntryType;
import za.co.fleetexpense.entity.enums.OdometerReadingType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.FuelLogRepository;
import za.co.fleetexpense.repository.OdometerDriftAlertRepository;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.TripRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;
import za.co.fleetexpense.entity.VehicleTaxProfile;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.apache.commons.imaging.ImageReadException;
import org.apache.commons.imaging.Imaging;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final TripRepository tripRepository;
    private final ExpenseRepository expenseRepository;
    private final FuelLogRepository fuelLogRepository;
    private final VehicleRepository vehicleRepository;
    private final OdometerDriftAlertRepository odometerDriftAlertRepository;
    private final OdometerVerificationRepository odometerVerificationRepository;
    private final TaxYearSummaryService taxYearSummaryService;
    private final TemplateEngine templateEngine;
    private final EntryImageService entryImageService;
    private final PermissionService permissionService;
    private final TaxCalculationService taxCalculationService;
    private final VehicleTaxProfileRepository vehicleTaxProfileRepository;

    public byte[] exportSarsLogbook(ExportRequest request, UUID organizationId, String username, String userRole) {
        // Check EXPORT_SARS_LOGBOOK permission
        if (!permissionService.isAllowed(organizationId, "EXPORT", "EXPORT_SARS_LOGBOOK", userRole)) {
            throw new za.co.fleetexpense.exception.ValidationException("You do not have permission to export SARS logbooks");
        }
        
        log.info("Starting SARS logbook export for vehicle: {}, format: {}, taxYear: {}", request.getVehicleId(), request.getFormat(), request.getTaxYear());
        SarsLogbookExportDTO exportData = gatherExportData(request, organizationId, username);
        log.info("Export data gathered successfully");

        return switch (request.getFormat()) {
            case EXCEL -> generateExcel(exportData, request);
            case PDF -> generatePdf(exportData, request);
            case HTML -> generateHtml(exportData, request);
            case CSV -> generateCsv(exportData);
        };
    }

    public byte[] exportTrips(ExportRequest request, UUID organizationId, String username, String userRole) {
        // Check EXPORT_TRIPS permission
        if (!permissionService.isAllowed(organizationId, "EXPORT", "EXPORT_TRIPS", userRole)) {
            throw new za.co.fleetexpense.exception.ValidationException("You do not have permission to export trips");
        }

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        int taxYear = request.getTaxYear();
        List<Trip> trips = tripRepository.findByVehicleId(vehicle.getId()).stream()
                .filter(t -> t.getTripDate().getYear() == taxYear)
                .collect(Collectors.toList());

        return switch (request.getFormat()) {
            case EXCEL -> generateTripsExcel(trips, vehicle, taxYear);
            case CSV -> generateTripsCsv(trips, vehicle, taxYear);
            case HTML -> generateTripsHtml(trips, vehicle, taxYear);
            default -> throw new IllegalArgumentException("Unsupported format for trip export");
        };
    }

    /**
     * Phase 9: Dedicated SARS submission export - formatted specifically for SARS eFiling
     * This is a separate, dedicated export for SARS tax return submission
     * BLOCKS export if odometer drift exists (applies to ALL users)
     */
    public byte[] exportSarsSubmission(ExportRequest request, UUID organizationId, String username, String userRole) {
        // Check EXPORT_SARS_LOGBOOK permission
        if (!permissionService.isAllowed(organizationId, "EXPORT", "EXPORT_SARS_LOGBOOK", userRole)) {
            throw new za.co.fleetexpense.exception.ValidationException("You do not have permission to export SARS submissions");
        }

        log.info("Starting SARS submission export for vehicle: {}, taxYear: {}", request.getVehicleId(), request.getTaxYear());

        // Phase 9: Check for active odometer drift alerts - BLOCKS export for ALL users
        if (request.getVehicleId() != null) {
            boolean hasDrift = odometerDriftAlertRepository.findByVehicleIdAndIsDismissedFalse(request.getVehicleId()).isPresent();
            if (hasDrift) {
                throw new za.co.fleetexpense.exception.ValidationException(
                    "Cannot export SARS submission: Active odometer drift alert exists. " +
                    "Please resolve odometer drift before exporting for SARS submission."
                );
            }
        }

        SarsLogbookExportDTO exportData = gatherExportData(request, organizationId, username);

        // Generate Excel formatted specifically for SARS eFiling
        return generateSarsSubmissionExcel(exportData, request);
    }

    /**
     * Phase 10: Enhanced existing export with SARS-specific tax summary data
     * This enhances the standard SARS logbook export to include tax calculation details
     */
    public byte[] exportEnhancedSarsLogbook(ExportRequest request, UUID organizationId, String username, String userRole) {
        // Check EXPORT_SARS_LOGBOOK permission
        if (!permissionService.isAllowed(organizationId, "EXPORT", "EXPORT_SARS_LOGBOOK", userRole)) {
            throw new za.co.fleetexpense.exception.ValidationException("You do not have permission to export enhanced SARS logbooks");
        }

        log.info("Starting enhanced SARS logbook export for vehicle: {}, taxYear: {}", request.getVehicleId(), request.getTaxYear());
        SarsLogbookExportDTO exportData = gatherExportData(request, organizationId, username);

        // Generate Excel with tax calculation details
        return generateEnhancedSarsLogbookExcel(exportData, request);
    }

    private record TaxCalculationSelection(TaxCalculationMethod method, TaxCalculationResult result, String formula) {}

    private TaxCalculationSelection calculateSelectedDeduction(UUID vehicleId, ExportRequest request, TaxYearSummaryDTO summary) {
        VehicleTaxProfile profile = vehicleTaxProfileRepository.findByVehicleIdAndEffectiveToIsNull(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Active vehicle tax profile not found"));
        LocalDate start = LocalDate.of(request.getTaxYear(), 3, 1);
        LocalDate end = LocalDate.of(request.getTaxYear() + 1, 2, 28).with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
        BigDecimal businessKm = BigDecimal.valueOf(summary.getBusinessKm() == null ? 0 : summary.getBusinessKm());
        BigDecimal totalKm = BigDecimal.valueOf(summary.getTotalKm() == null ? 0 : summary.getTotalKm());
        TaxCalculationMethod method = request.getCalculationMethod() == null
                ? TaxCalculationMethod.ACTUAL_COSTS
                : TaxCalculationMethod.valueOf(request.getCalculationMethod());
        TaxCalculationResult result = switch (method) {
            case ACTUAL_COSTS -> taxCalculationService.calculateActualCosts(profile,
                    BigDecimal.valueOf(summary.getQualifyingCurrentExpenseCents() == null ? 0 : summary.getQualifyingCurrentExpenseCents()),
                    businessKm, totalKm, start, end);
            case SARS_COST_SCALE -> taxCalculationService.calculateSarsCostScale(profile, start, end, businessKm, totalKm);
            case SIMPLIFIED_REIMBURSIVE -> taxCalculationService.calculateSimplifiedReimbursive(profile, start, end, businessKm);
        };
        if (!Boolean.TRUE.equals(result.getEligible())) {
            throw new za.co.fleetexpense.exception.ValidationException(result.getIneligibilityReason());
        }
        String formula = switch (method) {
            case ACTUAL_COSTS -> "Qualifying costs × (business KM ÷ total KM); private KM reduces the deductible share";
            case SARS_COST_SCALE -> "SARS fixed cost scale × business-use share + qualifying fuel/maintenance";
            case SIMPLIFIED_REIMBURSIVE -> "SARS prescribed AA rate × business KM";
        };
        return new TaxCalculationSelection(method, result, formula);
    }

    private SarsLogbookExportDTO gatherExportData(ExportRequest request, UUID orgId, String username) {
        // If vehicleId is null, export all vehicles for the organization
        if (request.getVehicleId() == null) {
            return gatherAllVehiclesExportData(request, orgId, username);
        }

        log.info("Gathering export data for vehicle: {}, orgId: {}, username: {}", request.getVehicleId(), orgId, username);
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        log.info("Vehicle found: {}", vehicle.getRegistrationNumber());

        int taxYear = request.getTaxYear();
        log.info("Getting SARS logbook data for tax year: {}", taxYear);
        TaxYearSummaryDTO taxSummary = taxYearSummaryService.calculateSummary(vehicle.getId(), taxYear, vehicle.getOrganization().getId());
        log.info("SARS logbook data retrieved successfully");

        TaxCalculationSelection selection = calculateSelectedDeduction(vehicle.getId(), request, taxSummary);
        BigDecimal deductibleRands = selection.result().getTotalDeductionCents()
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        SarsLogbookExportDTO.SarsLogbookExportDTOBuilder builder = SarsLogbookExportDTO.builder()
                .vehicleId(vehicle.getId())
                .vehicleRegistration(vehicle.getRegistrationNumber())
                .vehicleMake(vehicle.getMake())
                .vehicleModel(vehicle.getModel())
                .vehicleYear(vehicle.getYear())
                .taxYear(taxYear)
                .openingOdometer((Integer) taxSummary.getOpeningOdometer())
                .closingOdometer((Integer) taxSummary.getClosingOdometer())
                .totalKm(taxSummary.getTotalKm())
                .businessKm(taxSummary.getBusinessKm())
                .privateKm(taxSummary.getPrivateKm())
                .businessPercentage(taxSummary.getBusinessPercentage())
                .totalExpenses(taxSummary.getTotalExpensesZar())
                .fuelExpenses(taxSummary.getFuelExpensesZar())
                .maintenanceExpenses(taxSummary.getMaintenanceExpensesZar())
                .fixedExpenses(taxSummary.getFixedExpensesZar())
                .deductibleExpenses(deductibleRands)
                .selectedCalculationMethod(selection.method().name())
                .deductionFormula(selection.formula())
                .provisionalActualCostsEstimate(deductibleRands)
                .calculationMethodLabel(selection.result().getBracketDescription())
                .generatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .generatedBy(username)
                .organizationName(vehicle.getOrganization().getName());

        if (Boolean.TRUE.equals(request.getIncludeTrips())) {
            List<Trip> trips = tripRepository.findByVehicleId(vehicle.getId()).stream()
                    .filter(t -> t.getTripDate().getYear() == taxYear)
                    .filter(t -> !Boolean.TRUE.equals(request.getSarsCompliantOnly()) || isSarsCompliant(t))
                    .collect(Collectors.toList());
            builder.trips(trips.stream().map(this::mapTripToEntry).collect(Collectors.toList()));
        }

        if (Boolean.TRUE.equals(request.getIncludeExpenses())) {
            List<Expense> expenses = expenseRepository.findByVehicleId(vehicle.getId()).stream()
                    .filter(e -> e.getExpenseDate().getYear() == taxYear)
                    .collect(Collectors.toList());
            builder.expenses(expenses.stream().map(this::mapExpenseToEntry).collect(Collectors.toList()));
        }

        // Fetch odometer verification images for SARS compliance
        try {
            OdometerVerification openingVerification = odometerVerificationRepository
                    .findByVehicleYearAndType(vehicle.getId(), taxYear, OdometerReadingType.OPENING)
                    .orElse(null);
            if (openingVerification != null && openingVerification.getImageUrlAvif() != null) {
                builder.openingOdometerImageUrl(
                        toInlineImageData(openingVerification.getImageUrlAvif(), null)
                );
            }

            OdometerVerification closingVerification = odometerVerificationRepository
                    .findByVehicleYearAndType(vehicle.getId(), taxYear, OdometerReadingType.CLOSING)
                    .orElse(null);
            if (closingVerification != null && closingVerification.getImageUrlAvif() != null) {
                builder.closingOdometerImageUrl(
                        toInlineImageData(closingVerification.getImageUrlAvif(), null)
                );
            }
        } catch (Exception e) {
            log.warn("Could not fetch odometer verification images: {}", e.getMessage());
        }

        if (Boolean.TRUE.equals(request.getIncludeFuelLogs())) {
            List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicle.getId()).stream()
                    .filter(f -> f.getExpense().getExpenseDate().getYear() == taxYear)
                    .collect(Collectors.toList());
            builder.fuelLogs(fuelLogs.stream().map(this::mapFuelLogToEntry).collect(Collectors.toList()));
        }

        return builder.build();
    }

    private SarsLogbookExportDTO gatherAllVehiclesExportData(ExportRequest request, UUID orgId, String username) {
        log.info("Gathering export data for ALL vehicles in organization: {}, username: {}", orgId, username);
        
        List<Vehicle> vehicles = vehicleRepository.findByOrganizationId(orgId);
        if (vehicles.isEmpty()) {
            throw new ResourceNotFoundException("No vehicles found for organization");
        }
        
        log.info("Found {} vehicles to export", vehicles.size());
        
        int taxYear = request.getTaxYear();
        
        // Aggregate data from all vehicles
        List<SarsLogbookExportDTO.TripEntry> allTrips = new java.util.ArrayList<>();
        List<SarsLogbookExportDTO.ExpenseEntry> allExpenses = new java.util.ArrayList<>();
        List<SarsLogbookExportDTO.FuelLogEntry> allFuelLogs = new java.util.ArrayList<>();
        
        int totalOpeningOdometer = 0;
        int totalClosingOdometer = 0;
        int totalKm = 0;
        int totalBusinessKm = 0;
        int totalPrivateKm = 0;
        BigDecimal totalExpenses = BigDecimal.ZERO;
        BigDecimal totalFuelExpenses = BigDecimal.ZERO;
        BigDecimal totalMaintenanceExpenses = BigDecimal.ZERO;
        BigDecimal totalFixedExpenses = BigDecimal.ZERO;
        
        // Phase 1: Calculate provisional Actual Costs per vehicle, then aggregate
        BigDecimal provisionalActualCostsEstimate = BigDecimal.ZERO;
        
        for (Vehicle vehicle : vehicles) {
            log.info("Processing vehicle: {}", vehicle.getRegistrationNumber());
            
            TaxYearSummaryDTO taxSummary = taxYearSummaryService.calculateSummary(vehicle.getId(), taxYear, vehicle.getOrganization().getId());
            
            totalOpeningOdometer += taxSummary.getOpeningOdometer() != null ? taxSummary.getOpeningOdometer() : 0;
            totalClosingOdometer += taxSummary.getClosingOdometer() != null ? taxSummary.getClosingOdometer() : 0;
            totalKm += taxSummary.getTotalKm() != null ? taxSummary.getTotalKm() : 0;
            totalBusinessKm += taxSummary.getBusinessKm() != null ? taxSummary.getBusinessKm() : 0;
            totalPrivateKm += taxSummary.getPrivateKm() != null ? taxSummary.getPrivateKm() : 0;
            totalExpenses = totalExpenses.add(taxSummary.getTotalExpensesZar() != null ? taxSummary.getTotalExpensesZar() : BigDecimal.ZERO);
            totalFuelExpenses = totalFuelExpenses.add(taxSummary.getFuelExpensesZar() != null ? taxSummary.getFuelExpensesZar() : BigDecimal.ZERO);
            totalMaintenanceExpenses = totalMaintenanceExpenses.add(taxSummary.getMaintenanceExpensesZar() != null ? taxSummary.getMaintenanceExpensesZar() : BigDecimal.ZERO);
            totalFixedExpenses = totalFixedExpenses.add(taxSummary.getFixedExpensesZar() != null ? taxSummary.getFixedExpensesZar() : BigDecimal.ZERO);
            
            // Phase 1: Calculate provisional Actual Costs for this vehicle
            if (taxSummary.getTotalKm() != null && taxSummary.getTotalKm() > 0 
                    && taxSummary.getBusinessKm() != null && taxSummary.getBusinessKm() > 0
                    && taxSummary.getQualifyingCurrentExpenseCents() != null && taxSummary.getQualifyingCurrentExpenseCents() > 0) {
                BigDecimal vehicleBusinessShare = BigDecimal.valueOf(taxSummary.getBusinessKm())
                        .divide(BigDecimal.valueOf(taxSummary.getTotalKm()), 10, RoundingMode.HALF_UP);
                BigDecimal vehicleProvisionalCost = BigDecimal.valueOf(taxSummary.getQualifyingCurrentExpenseCents())
                        .divide(BigDecimal.valueOf(100)) // Convert cents to Rands
                        .multiply(vehicleBusinessShare)
                        .setScale(2, RoundingMode.HALF_UP);
                provisionalActualCostsEstimate = provisionalActualCostsEstimate.add(vehicleProvisionalCost);
            }
            
            if (Boolean.TRUE.equals(request.getIncludeTrips())) {
                List<Trip> trips = tripRepository.findByVehicleId(vehicle.getId()).stream()
                        .filter(t -> t.getTripDate().getYear() == taxYear)
                        .filter(t -> !Boolean.TRUE.equals(request.getSarsCompliantOnly()) || isSarsCompliant(t))
                        .collect(Collectors.toList());
                allTrips.addAll(trips.stream().map(this::mapTripToEntry).collect(Collectors.toList()));
            }
            
            if (Boolean.TRUE.equals(request.getIncludeExpenses())) {
                List<Expense> expenses = expenseRepository.findByVehicleId(vehicle.getId()).stream()
                        .filter(e -> e.getExpenseDate().getYear() == taxYear)
                        .collect(Collectors.toList());
                allExpenses.addAll(expenses.stream().map(this::mapExpenseToEntry).collect(Collectors.toList()));
            }
            
            if (Boolean.TRUE.equals(request.getIncludeFuelLogs())) {
                List<FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicle.getId()).stream()
                        .filter(f -> f.getExpense().getExpenseDate().getYear() == taxYear)
                        .collect(Collectors.toList());
                allFuelLogs.addAll(fuelLogs.stream().map(this::mapFuelLogToEntry).collect(Collectors.toList()));
            }
        }
        
        // Calculate aggregate business percentage
        BigDecimal businessPercentage = totalKm > 0 
            ? new BigDecimal(totalBusinessKm).multiply(new BigDecimal("100")).divide(new BigDecimal(totalKm), 2, java.math.RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        
        // Get organization name from first vehicle
        String organizationName = vehicles.get(0).getOrganization().getName();
        
        return SarsLogbookExportDTO.builder()
                .vehicleId(null) // Indicates all vehicles
                .vehicleRegistration("All Vehicles")
                .vehicleMake("Multiple")
                .vehicleModel("Multiple")
                .vehicleYear(null)
                .taxYear(taxYear)
                .openingOdometer(totalOpeningOdometer)
                .closingOdometer(totalClosingOdometer)
                .totalKm(totalKm)
                .businessKm(totalBusinessKm)
                .privateKm(totalPrivateKm)
                .businessPercentage(businessPercentage)
                .totalExpenses(totalExpenses)
                .fuelExpenses(totalFuelExpenses)
                .maintenanceExpenses(totalMaintenanceExpenses)
                .fixedExpenses(totalFixedExpenses)
                .deductibleExpenses(provisionalActualCostsEstimate)
                .provisionalActualCostsEstimate(provisionalActualCostsEstimate)
                .calculationMethodLabel("Provisional Actual Costs estimate (aggregate)")
                .generatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .generatedBy(username)
                .organizationName(organizationName)
                .trips(allTrips)
                .expenses(allExpenses)
                .fuelLogs(allFuelLogs)
                .build();
    }

    private boolean isSarsCompliant(Trip trip) {
        return trip.getTripDate() != null &&
               trip.getStartOdometer() != null &&
               trip.getEndOdometer() != null &&
               trip.getDistanceKm() != null &&
               trip.getPurpose() != null &&
               trip.getStartLocation() != null && !trip.getStartLocation().isEmpty() &&
               trip.getEndLocation() != null && !trip.getEndLocation().isEmpty() &&
               trip.getReasonForTrip() != null && !trip.getReasonForTrip().isEmpty();
    }

    private SarsLogbookExportDTO.TripEntry mapTripToEntry(Trip trip) {
        return SarsLogbookExportDTO.TripEntry.builder()
                .date(trip.getTripDate())
                .startTime(trip.getStartTime())
                .endTime(trip.getEndTime())
                .openingKm(trip.getStartOdometer())
                .closingKm(trip.getEndOdometer())
                .distanceKm(trip.getDistanceKm())
                .purpose(trip.getPurpose().name())
                .startLocation(trip.getStartLocation())
                .destination(trip.getEndLocation())
                .reasonForTrip(trip.getReasonForTrip())
                .customerName(trip.getCustomerClientName())
                .tollCosts(trip.getTollCostsZar())
                .parkingCosts(trip.getParkingCostsZar())
                .build();
    }

    private SarsLogbookExportDTO.ExpenseEntry mapExpenseToEntry(Expense expense) {
        String receiptUrl = null;
        String receiptMimeTypeHint = null;

        // Always prefer entry_images table over legacy receiptImageUrl field
        // The legacy field may have incorrect paths with vehicle UUID folders
        try {
            List<EntryImage> images = entryImageService.getByEntry(EntryType.EXPENSE, expense.getId());
            if (!images.isEmpty()) {
                // Use the primary image URL (already used by the frontend)
                EntryImage primary = images.get(0);
                receiptUrl = primary.getImageUrl();
                receiptMimeTypeHint = primary.getMimeType();
            }
        } catch (Exception e) {
            log.warn("Failed to load receipt images for expense {}: {}", expense.getId(), e.getMessage());
        }

        // Embed the image bytes directly as a data URI so the export is fully self-contained
        receiptUrl = toInlineImageData(receiptUrl, receiptMimeTypeHint);

        return SarsLogbookExportDTO.ExpenseEntry.builder()
                .date(expense.getExpenseDate())
                .category(expense.getCategory().name())
                .description(expense.getDescription())
                .amount(expense.getAmountZar())
                .vatAmount(expense.getVatAmountZar())
                .taxDeductible(expense.getIsTaxDeductible())
                .receiptImageUrl(receiptUrl)
                .build();
    }

    /**
     * Ensure that image URLs used in exports are absolute so they still resolve
     * correctly when the generated HTML is opened directly from disk.
     */
    private String toAbsoluteImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        // Already absolute (HTTP/S) or data URI
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
            return imageUrl;
        }

        // For relative paths like /api/v1/storage/..., convert to absolute HTTP URL
        String normalizedPath = imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl;
        try {
            // Use the backend's public URL (fleet-expense-app.duckdns.org)
            String baseUrl = "https://fleet-expense-app.duckdns.org";
            return baseUrl + normalizedPath;
        } catch (Exception e) {
            log.warn("Could not build absolute image URL for '{}': {}", imageUrl, e.getMessage());
            // Fallback to original relative path
            return imageUrl;
        }
    }

    /**
     * Convert a stored image (referenced by a relative URL like "/uploads/...") into
     * a base64 data URI so that exported HTML/PDF files are completely self-contained
     * and can be viewed offline with all images visible.
     * For PDF compatibility, converts WEBP/AVIF images to PNG format if possible.
     */
    private String toInlineImageData(String imageUrl, String mimeTypeHint) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        // Already an embedded data URI; leave as-is
        if (imageUrl.startsWith("data:")) {
            return imageUrl;
        }

        // OCI integration disabled - skip OCI URLs
        if (imageUrl.startsWith("/api/images/")) {
            log.warn("OCI image download not supported, skipping image: {}", imageUrl);
            return null;
        }

        // For HTTP URLs, convert to local path and try filesystem first
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            // Convert absolute URL to relative path for local filesystem access
            String relativePath = imageUrl;
            if (imageUrl.contains("/api/v1/storage/")) {
                relativePath = imageUrl.substring(imageUrl.indexOf("/api/v1/storage/") + "/api/v1/storage/".length()); // Remove full path to get "expenses-receipts/..."
            } else if (imageUrl.contains("/storage/")) {
                relativePath = imageUrl.substring(imageUrl.indexOf("/storage/") + "/storage/".length());
            }
            
            // Try local filesystem first
            String localResult = tryLocalFilesystem(relativePath, mimeTypeHint);
            if (localResult != null) {
                return localResult;
            }
            
            // Fall back to HTTP download if local file doesn't exist
            log.info("Local file not found, trying HTTP download: {}", relativePath);
            try {
                java.net.URL url = new java.net.URL(imageUrl);
                byte[] bytes = url.openStream().readAllBytes();
                
                // Detect MIME type from URL or hint
                String mimeType = mimeTypeHint;
                if (mimeType == null || mimeType.isBlank()) {
                    String lower = imageUrl.toLowerCase();
                    if (lower.endsWith(".png")) {
                        mimeType = "image/png";
                    } else if (lower.endsWith(".webp")) {
                        mimeType = "image/webp";
                    } else if (lower.endsWith(".avif")) {
                        mimeType = "image/avif";
                    } else if (lower.endsWith(".gif")) {
                        mimeType = "image/gif";
                    } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                        mimeType = "image/jpeg";
                    } else {
                        mimeType = "image/jpeg"; // default
                    }
                }

                // Try to convert WEBP/AVIF to PNG for PDF compatibility
                if ("image/webp".equals(mimeType) || "image/avif".equals(mimeType)) {
                    try {
                        bytes = convertToPng(bytes, mimeType);
                        mimeType = "image/png";
                        log.info("Converted {} image to PNG for PDF compatibility: {}", mimeType, imageUrl);
                    } catch (Exception e) {
                        log.warn("Failed to convert {} to PNG, skipping: {}", mimeType, e.getMessage());
                        return null;
                    }
                }

                String base64 = Base64.getEncoder().encodeToString(bytes);
                return "data:" + mimeType + ";base64," + base64;
            } catch (Exception e) {
                log.warn("Could not download and embed image '{}': {}", imageUrl, e.getMessage());
                return null;
            }
        }

        try {
            // imageUrl is typically like "/api/v1/storage/entry-images/uuid.jpg" or "/uploads/entry-images/uuid.jpg"
            // We need to convert this to the actual file path in the storage directory
            String relativePath = imageUrl.startsWith("/") ? imageUrl.substring(1) : imageUrl;
            
            // Handle both /api/v1/storage/... and /uploads/... paths
            if (relativePath.startsWith("api/v1/storage/")) {
                // Convert /api/v1/storage/expenses-receipts/vehicleId/file.jpg to storage/expenses-receipts/expenses/file.jpg
                // Images are stored in a flat "expenses" folder, not in vehicle-specific folders
                relativePath = "storage/" + relativePath.substring("api/v1/storage/".length());
                
                // If path contains a vehicle UUID folder, extract just the filename and use flat structure
                if (relativePath.contains("expenses-receipts/") && relativePath.matches(".*expenses-receipts/[a-f0-9-]+/.*")) {
                    String[] parts = relativePath.split("/");
                    // Find the filename (last part)
                    String filename = parts[parts.length - 1];
                    // Rebuild path with flat structure
                    relativePath = "storage/expenses-receipts/expenses/" + filename;
                }
            } else if (relativePath.startsWith("uploads/")) {
                // Convert /uploads/entry-images/uuid/file.jpg to storage/entry-images/uuid/file.jpg
                relativePath = "storage/" + relativePath.substring("uploads/".length());
                
                // Same flat structure fix for uploads path
                if (relativePath.contains("expenses-receipts/") && relativePath.matches(".*expenses-receipts/[a-f0-9-]+/.*")) {
                    String[] parts = relativePath.split("/");
                    String filename = parts[parts.length - 1];
                    relativePath = "storage/expenses-receipts/expenses/" + filename;
                }
            }
            
            // In Docker, files are stored in /app/storage/, so prepend the base path
            Path filePath = Paths.get("/app", relativePath);

            if (!Files.exists(filePath)) {
                log.warn("Image file does not exist on disk for export: {} (looking for: {})", imageUrl, filePath);
                // Fall back to HTTP URL download
                String absoluteUrl = toAbsoluteImageUrl(imageUrl);
                if (absoluteUrl != null && (absoluteUrl.startsWith("http://") || absoluteUrl.startsWith("https://"))) {
                    return toInlineImageData(absoluteUrl, mimeTypeHint);
                }
                return null;
            }

            byte[] bytes = Files.readAllBytes(filePath);

            String mimeType = mimeTypeHint;
            if (mimeType == null || mimeType.isBlank()) {
                try {
                    mimeType = Files.probeContentType(filePath);
                } catch (IOException ignored) {
                    // fall through to extension-based detection
                }
            }

            if (mimeType == null || mimeType.isBlank()) {
                String lower = relativePath.toLowerCase();
                if (lower.endsWith(".png")) {
                    mimeType = "image/png";
                } else if (lower.endsWith(".webp")) {
                    mimeType = "image/webp";
                } else if (lower.endsWith(".avif")) {
                    mimeType = "image/avif";
                } else if (lower.endsWith(".gif")) {
                    mimeType = "image/gif";
                } else {
                    mimeType = "image/jpeg";
                }
            }

            // Try to convert WEBP/AVIF to PNG for PDF compatibility
            if ("image/webp".equals(mimeType) || "image/avif".equals(mimeType)) {
                try {
                    bytes = convertToPng(bytes, mimeType);
                    mimeType = "image/png";
                    log.info("Converted {} image to PNG for PDF compatibility: {}", mimeType, relativePath);
                } catch (Exception e) {
                    log.warn("Failed to convert {} to PNG, skipping: {}", mimeType, e.getMessage());
                    return null;
                }
            }

            String base64 = Base64.getEncoder().encodeToString(bytes);
            return "data:" + mimeType + ";base64," + base64;

        } catch (Exception e) {
            log.warn("Could not embed image '{}' as data URI: {}", imageUrl, e.getMessage());
            // Return null to show "No receipt" instead of broken image
            return null;
        }
    }

    /**
     * Try to read image from local filesystem for HTTP URLs
     * This avoids SSL certificate issues and is faster than HTTP download
     */
    private String tryLocalFilesystem(String relativePath, String mimeTypeHint) {
        try {
            // Convert URL path to filesystem path
            String path = relativePath;
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
            
            // Handle /api/v1/storage/... and /storage/... paths
            if (path.startsWith("api/v1/storage/")) {
                path = "storage/" + path.substring("api/v1/storage/".length());
                
                // If path contains a vehicle UUID folder, extract just the filename and use flat structure
                if (path.contains("expenses-receipts/") && path.matches(".*expenses-receipts/[a-f0-9-]+/.*")) {
                    String[] parts = path.split("/");
                    String filename = parts[parts.length - 1];
                    path = "storage/expenses-receipts/expenses/" + filename;
                }
            } else if (!path.startsWith("storage/")) {
                path = "storage/" + path;
                
                // Same flat structure fix
                if (path.contains("expenses-receipts/") && path.matches(".*expenses-receipts/[a-f0-9-]+/.*")) {
                    String[] parts = path.split("/");
                    String filename = parts[parts.length - 1];
                    path = "storage/expenses-receipts/expenses/" + filename;
                }
            }
            
            Path filePath = Paths.get("/app", path);
            
            if (!Files.exists(filePath)) {
                log.debug("Local file not found: {}", filePath);
                
                // Try to find the file by filename in the flat expenses folder
                // This handles cases where the database has incorrect paths with vehicle UUID folders
                String filename = Paths.get(relativePath).getFileName().toString();
                Path flatPath = Paths.get("/app/storage/expenses-receipts/expenses", filename);
                
                if (Files.exists(flatPath)) {
                    log.debug("Found file in flat expenses folder: {}", flatPath);
                    filePath = flatPath;
                } else {
                    return null;
                }
            }
            
            byte[] bytes = Files.readAllBytes(filePath);
            
            String mimeType = mimeTypeHint;
            if (mimeType == null || mimeType.isBlank()) {
                try {
                    mimeType = Files.probeContentType(filePath);
                } catch (IOException ignored) {
                    // fall through to extension-based detection
                }
            }
            
            if (mimeType == null || mimeType.isBlank()) {
                String lower = path.toLowerCase();
                if (lower.endsWith(".png")) {
                    mimeType = "image/png";
                } else if (lower.endsWith(".webp")) {
                    mimeType = "image/webp";
                } else if (lower.endsWith(".avif")) {
                    mimeType = "image/avif";
                } else if (lower.endsWith(".gif")) {
                    mimeType = "image/gif";
                } else {
                    mimeType = "image/jpeg";
                }
            }
            
            // Try to convert WEBP/AVIF to PNG for PDF compatibility
            if ("image/webp".equals(mimeType) || "image/avif".equals(mimeType)) {
                try {
                    bytes = convertToPng(bytes, mimeType);
                    mimeType = "image/png";
                    log.info("Converted {} image to PNG for PDF compatibility: {}", mimeType, path);
                } catch (Exception e) {
                    log.warn("Failed to convert {} to PNG, skipping: {}", mimeType, e.getMessage());
                    return null;
                }
            }
            
            String base64 = Base64.getEncoder().encodeToString(bytes);
            return "data:" + mimeType + ";base64," + base64;
        } catch (Exception e) {
            log.warn("Could not read local file '{}': {}", relativePath, e.getMessage());
            return null;
        }
    }

    /**
     * Convert image bytes to PNG format for PDF compatibility.
     * This handles WEBP and AVIF formats which are not supported by OpenHTMLToPDF.
     */
    private byte[] convertToPng(byte[] imageBytes, String sourceMimeType) throws IOException {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(imageBytes)) {
            BufferedImage image = null;
            
            // Try ImageIO first (works for WEBP with the TwelveMonkeys plugin)
            image = ImageIO.read(bis);
            
            // If ImageIO fails, try Apache Commons Imaging (may handle some AVIF)
            if (image == null) {
                try {
                    bis.reset();
                    image = Imaging.getBufferedImage(imageBytes);
                } catch (ImageReadException e) {
                    throw new IOException("Could not read image with either ImageIO or Commons Imaging", e);
                }
            }
            
            if (image == null) {
                throw new IOException("Could not read image data for " + sourceMimeType);
            }
            
            try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
                ImageIO.write(image, "png", bos);
                return bos.toByteArray();
            }
        } catch (Exception e) {
            throw new IOException("Failed to convert " + sourceMimeType + " to PNG", e);
        }
    }

    private SarsLogbookExportDTO.FuelLogEntry mapFuelLogToEntry(FuelLog fuelLog) {
        return SarsLogbookExportDTO.FuelLogEntry.builder()
                .date(fuelLog.getExpense().getExpenseDate())
                .fuelType(fuelLog.getFuelType().name())
                .liters(fuelLog.getLiters())
                .pricePerLiter(fuelLog.getPricePerLiter())
                .totalCost(fuelLog.getLiters().multiply(fuelLog.getPricePerLiter()))
                .odometerReading(fuelLog.getExpense().getOdometerReading())
                .consumptionLPer100km(fuelLog.getConsumptionLPer100km())
                .stationName(fuelLog.getStationName())
                .build();
    }
// ==================== EXCEL GENERATOR ====================
 
    private byte[] generateExcel(SarsLogbookExportDTO data, ExportRequest request) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
 
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
 
            if (Boolean.TRUE.equals(request.getIncludeSummary())) {
                Sheet summarySheet = workbook.createSheet("Summary");
                createSummarySheet(summarySheet, data, headerStyle, currencyStyle);
            }
 
            if (Boolean.TRUE.equals(request.getIncludeTrips()) && data.getTrips() != null) {
                Sheet tripsSheet = workbook.createSheet("Travel Logbook");
                createTripsSheet(tripsSheet, data.getTrips(), headerStyle);
            }
 
            if (Boolean.TRUE.equals(request.getIncludeExpenses()) && data.getExpenses() != null) {
                Sheet expensesSheet = workbook.createSheet("Expenses");
                createExpensesSheet(expensesSheet, data.getExpenses(), headerStyle, currencyStyle);
            }
 
            if (Boolean.TRUE.equals(request.getIncludeFuelLogs()) && data.getFuelLogs() != null) {
                Sheet fuelSheet = workbook.createSheet("Fuel Logs");
                createFuelLogsSheet(fuelSheet, data.getFuelLogs(), headerStyle, currencyStyle);
            }
 
            workbook.write(outputStream);
            return outputStream.toByteArray();
 
        } catch (IOException e) {
            log.error("Error generating Excel export", e);
            throw new RuntimeException("Failed to generate Excel export", e);
        }
    }
 
    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }
 
    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }
 
    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = createDataStyle(workbook);
        style.setDataFormat(workbook.createDataFormat().getFormat("R #,##0.00"));
        return style;
    }
 
    private void createSummarySheet(Sheet sheet, SarsLogbookExportDTO data,
                                    CellStyle headerStyle, CellStyle currencyStyle) {
        int rowNum = 0;
        Row titleRow = sheet.createRow(rowNum++);
        titleRow.createCell(0).setCellValue("SARS Travel Logbook Summary");
 
        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("Vehicle: " + data.getVehicleRegistration());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Tax Year: " + data.getTaxYear());
 
        rowNum++;
        String[][] summaryData = {
            {"Opening Odometer", String.valueOf(data.getOpeningOdometer())},
            {"Closing Odometer", String.valueOf(data.getClosingOdometer())},
            {"Total Distance", data.getTotalKm() + " km"},
            {"Business Distance", data.getBusinessKm() + " km"},
            {"Private Distance", data.getPrivateKm() + " km"},
            {"Business %", data.getBusinessPercentage() + "%"}
        };
 
        for (String[] rowData : summaryData) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(rowData[0]);
            row.createCell(1).setCellValue(rowData[1]);
        }
    }
 
    private void createTripsSheet(Sheet sheet, List<SarsLogbookExportDTO.TripEntry> trips,
                                   CellStyle headerStyle) {
        String[] headers = {"Date", "Opening", "Closing", "Distance", "Purpose", "From", "To", "Reason"};
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
 
        int rowNum = 1;
        for (SarsLogbookExportDTO.TripEntry trip : trips) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(trip.getDate().toString());
            row.createCell(1).setCellValue(trip.getOpeningKm());
            row.createCell(2).setCellValue(trip.getClosingKm());
            row.createCell(3).setCellValue(trip.getDistanceKm());
            row.createCell(4).setCellValue(trip.getPurpose());
            row.createCell(5).setCellValue(trip.getStartLocation());
            row.createCell(6).setCellValue(trip.getDestination());
            row.createCell(7).setCellValue(trip.getReasonForTrip());
        }
    }
 
    private void createExpensesSheet(Sheet sheet, List<SarsLogbookExportDTO.ExpenseEntry> expenses,
                                      CellStyle headerStyle, CellStyle currencyStyle) {
        String[] headers = {"Date", "Category", "Description", "Amount", "VAT", "Deductible"};
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
 
        int rowNum = 1;
        for (SarsLogbookExportDTO.ExpenseEntry expense : expenses) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(expense.getDate().toString());
            row.createCell(1).setCellValue(expense.getCategory());
            row.createCell(2).setCellValue(expense.getDescription());
            Cell amountCell = row.createCell(3);
            amountCell.setCellValue(expense.getAmount().doubleValue());
            amountCell.setCellStyle(currencyStyle);
        }
    }
 
    private void createFuelLogsSheet(Sheet sheet, List<SarsLogbookExportDTO.FuelLogEntry> fuelLogs,
                                     CellStyle headerStyle, CellStyle currencyStyle) {
        String[] headers = {"Date", "Type", "Liters", "Price/L", "Total", "Odometer"};
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
 
        int rowNum = 1;
        for (SarsLogbookExportDTO.FuelLogEntry fuelLog : fuelLogs) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(fuelLog.getDate().toString());
            row.createCell(1).setCellValue(fuelLog.getFuelType());
            row.createCell(2).setCellValue(fuelLog.getLiters().doubleValue());
            row.createCell(3).setCellValue(fuelLog.getPricePerLiter().doubleValue());
            row.createCell(4).setCellValue(fuelLog.getTotalCost().doubleValue());
            row.createCell(5).setCellValue(fuelLog.getOdometerReading());
        }
    }
 
    private byte[] generatePdf(SarsLogbookExportDTO data, ExportRequest request) {
        String html = generateHtmlString(data, request);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.withHtmlContent(html, null);
            builder.toStream(outputStream);
            builder.run();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Error generating PDF export", e);
            throw new RuntimeException("Failed to generate PDF export", e);
        }
    }
 
    private byte[] generateHtml(SarsLogbookExportDTO data, ExportRequest request) {
        return generateHtmlString(data, request).getBytes();
    }
 
    private String generateHtmlString(SarsLogbookExportDTO data, ExportRequest request) {
        Context context = new Context();
        context.setVariable("data", data);
        context.setVariable("request", request);
        return templateEngine.process("sars-logbook", context);
    }

    private byte[] generateCsv(SarsLogbookExportDTO data) {
        try (StringWriter writer = new StringWriter()) {
            // Write trips if available
            if (data.getTrips() != null && !data.getTrips().isEmpty()) {
                writer.write("Date,Start Time,End Time,Opening KM,Closing KM,Distance KM,Purpose,Start Location,Destination,Reason,Customer,Toll Costs,Parking Costs\n");
                for (SarsLogbookExportDTO.TripEntry trip : data.getTrips()) {
                    writer.append(String.valueOf(trip.getDate())).append(",");
                    writer.append(trip.getStartTime() != null ? String.valueOf(trip.getStartTime()) : "").append(",");
                    writer.append(trip.getEndTime() != null ? String.valueOf(trip.getEndTime()) : "").append(",");
                    writer.append(String.valueOf(trip.getOpeningKm())).append(",");
                    writer.append(String.valueOf(trip.getClosingKm())).append(",");
                    writer.append(String.valueOf(trip.getDistanceKm())).append(",");
                    writer.append(trip.getPurpose()).append(",");
                    writer.append(trip.getStartLocation()).append(",");
                    writer.append(trip.getDestination()).append(",");
                    writer.append(trip.getReasonForTrip()).append(",");
                    writer.append(trip.getCustomerName() != null ? trip.getCustomerName() : "").append(",");
                    writer.append(trip.getTollCosts() != null ? String.valueOf(trip.getTollCosts()) : "0").append(",");
                    writer.append(trip.getParkingCosts() != null ? String.valueOf(trip.getParkingCosts()) : "0");
                    writer.append("\n");
                }
            }
            return writer.toString().getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Error generating CSV export", e);
            throw new RuntimeException("Failed to generate CSV", e);
        }
    }

    private byte[] generateTripsExcel(List<Trip> trips, Vehicle vehicle, int taxYear) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            Sheet sheet = workbook.createSheet("Trip Records");
            String[] headers = {"Date", "Start Time", "End Time", "Start Odometer", "End Odometer", "Distance KM", "Purpose", "Start Location", "End Location", "Reason", "Customer", "Toll Costs", "Parking Costs"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (Trip trip : trips) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(trip.getTripDate().toString());
                row.createCell(1).setCellValue(trip.getStartTime() != null ? trip.getStartTime().toString() : "");
                row.createCell(2).setCellValue(trip.getEndTime() != null ? trip.getEndTime().toString() : "");
                row.createCell(3).setCellValue(trip.getStartOdometer());
                row.createCell(4).setCellValue(trip.getEndOdometer());
                row.createCell(5).setCellValue(trip.getDistanceKm());
                row.createCell(6).setCellValue(trip.getPurpose().name());
                row.createCell(7).setCellValue(trip.getStartLocation());
                row.createCell(8).setCellValue(trip.getEndLocation());
                row.createCell(9).setCellValue(trip.getReasonForTrip() != null ? trip.getReasonForTrip() : "");
                row.createCell(10).setCellValue(trip.getCustomerClientName() != null ? trip.getCustomerClientName() : "");

                Cell tollCell = row.createCell(11);
                tollCell.setCellValue(trip.getTollCostsZar() != null ? trip.getTollCostsZar().doubleValue() : 0.0);
                tollCell.setCellStyle(currencyStyle);

                Cell parkingCell = row.createCell(12);
                parkingCell.setCellValue(trip.getParkingCostsZar() != null ? trip.getParkingCostsZar().doubleValue() : 0.0);
                parkingCell.setCellStyle(currencyStyle);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Error generating Excel export", e);
            throw new RuntimeException("Failed to generate Excel export", e);
        }
    }

    private byte[] generateTripsCsv(List<Trip> trips, Vehicle vehicle, int taxYear) {
        try (StringWriter writer = new StringWriter()) {
            writer.write("Date,Start Time,End Time,Start Odometer,End Odometer,Distance KM,Purpose,Start Location,End Location,Reason,Customer,Toll Costs,Parking Costs\n");
            
            for (Trip trip : trips) {
                writer.append(String.valueOf(trip.getTripDate())).append(",");
                writer.append(trip.getStartTime() != null ? String.valueOf(trip.getStartTime()) : "").append(",");
                writer.append(trip.getEndTime() != null ? String.valueOf(trip.getEndTime()) : "").append(",");
                writer.append(String.valueOf(trip.getStartOdometer())).append(",");
                writer.append(String.valueOf(trip.getEndOdometer())).append(",");
                writer.append(String.valueOf(trip.getDistanceKm())).append(",");
                writer.append(trip.getPurpose().name()).append(",");
                writer.append(trip.getStartLocation()).append(",");
                writer.append(trip.getEndLocation()).append(",");
                writer.append(trip.getReasonForTrip() != null ? trip.getReasonForTrip() : "").append(",");
                writer.append(trip.getCustomerClientName() != null ? trip.getCustomerClientName() : "").append(",");
                writer.append(trip.getTollCostsZar() != null ? String.valueOf(trip.getTollCostsZar()) : "0").append(",");
                writer.append(trip.getParkingCostsZar() != null ? String.valueOf(trip.getParkingCostsZar()) : "0");
                writer.append("\n");
            }
            
            return writer.toString().getBytes(StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Error generating CSV export", e);
            throw new RuntimeException("Failed to generate CSV export", e);
        }
    }

    private byte[] generateTripsHtml(List<Trip> trips, Vehicle vehicle, int taxYear) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><head><meta charset='UTF-8' />");
        html.append("<title>Trip Records - ").append(vehicle.getRegistrationNumber()).append("</title>");
        html.append("<style>");
        html.append("@page { size: A4 landscape; margin: 10mm; }");
        html.append("body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #333; max-width: 260mm; margin: 0 auto; padding: 10mm; }");
        html.append("table { border-collapse: collapse; width: 100%; margin-top: 20px; font-size: 8pt; table-layout: fixed; }");
        html.append("th, td { border: 1px solid #ddd; padding: 6px; text-align: left; word-wrap: break-word; }");
        html.append("th { background-color: #f2f2f2; }");
        html.append("h1 { color: #333; }");
        html.append("</style></head><body>");
        html.append("<h1>Trip Records - ").append(vehicle.getRegistrationNumber()).append("</h1>");
        html.append("<p>Tax Year: ").append(taxYear).append("/").append(taxYear + 1).append("</p>");
        html.append("<p>Vehicle: ").append(vehicle.getYear()).append(" ").append(vehicle.getMake()).append(" ").append(vehicle.getModel()).append("</p>");
        html.append("<table>");
        html.append("<tr><th>Date</th><th>Start Time</th><th>End Time</th><th>Start Odometer</th><th>End Odometer</th><th>Distance KM</th><th>Purpose</th><th>Start Location</th><th>End Location</th><th>Reason</th><th>Customer</th><th>Toll Costs</th><th>Parking Costs</th></tr>");
        
        for (Trip trip : trips) {
            html.append("<tr>");
            html.append("<td>").append(trip.getTripDate()).append("</td>");
            html.append("<td>").append(trip.getStartTime() != null ? trip.getStartTime().toString() : "").append("</td>");
            html.append("<td>").append(trip.getEndTime() != null ? trip.getEndTime().toString() : "").append("</td>");
            html.append("<td>").append(trip.getStartOdometer()).append("</td>");
            html.append("<td>").append(trip.getEndOdometer()).append("</td>");
            html.append("<td>").append(trip.getDistanceKm()).append("</td>");
            html.append("<td>").append(trip.getPurpose().name()).append("</td>");
            html.append("<td>").append(trip.getStartLocation()).append("</td>");
            html.append("<td>").append(trip.getEndLocation()).append("</td>");
            html.append("<td>").append(trip.getReasonForTrip() != null ? trip.getReasonForTrip() : "").append("</td>");
            html.append("<td>").append(trip.getCustomerClientName() != null ? trip.getCustomerClientName() : "").append("</td>");
            html.append("<td>").append(trip.getTollCostsZar() != null ? String.valueOf(trip.getTollCostsZar()) : "0").append("</td>");
            html.append("<td>").append(trip.getParkingCostsZar() != null ? String.valueOf(trip.getParkingCostsZar()) : "0").append("</td>");
            html.append("</tr>");
        }
        
        html.append("</table></body></html>");
        return html.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] generateTripsPdf(List<Trip> trips, Vehicle vehicle, int taxYear) {
        String html = new String(generateTripsHtml(trips, vehicle, taxYear), StandardCharsets.UTF_8);
        log.info("Generating PDF for {} trips", trips.size());
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.withHtmlContent(html, null);
            builder.toStream(outputStream);
            builder.run();
            byte[] result = outputStream.toByteArray();
            log.info("PDF generated successfully, size: {} bytes", result.length);
            return result;
        } catch (Exception e) {
            log.error("Error generating PDF export: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF export: " + e.getMessage(), e);
        }
    }

    /**
     * Phase 9: Generate Excel formatted specifically for SARS eFiling submission
     * This is a dedicated export with SARS-specific formatting and required fields
     */
    private byte[] generateSarsSubmissionExcel(SarsLogbookExportDTO data, ExportRequest request) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle sarsStyle = createSarsSubmissionStyle(workbook);

            // SARS Submission Sheet - formatted for eFiling upload
            Sheet sarsSheet = workbook.createSheet("SARS_Submission");
            createSarsSubmissionSheet(sarsSheet, data, headerStyle, currencyStyle, sarsStyle);

            // Include detailed trip log as reference
            if (data.getTrips() != null) {
                Sheet tripsSheet = workbook.createSheet("Trip_Details");
                createTripsSheet(tripsSheet, data.getTrips(), headerStyle);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            log.error("Error generating SARS submission Excel", e);
            throw new RuntimeException("Failed to generate SARS submission Excel", e);
        }
    }

    /**
     * Phase 10: Generate enhanced SARS logbook with tax calculation details
     * This includes the standard logbook plus tax summary and calculation method comparison
     */
    private byte[] generateEnhancedSarsLogbookExcel(SarsLogbookExportDTO data, ExportRequest request) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            // Standard Summary Sheet
            Sheet summarySheet = workbook.createSheet("Summary");
            createSummarySheet(summarySheet, data, headerStyle, currencyStyle);

            // Enhanced Tax Calculation Sheet
            Sheet taxSheet = workbook.createSheet("Tax_Calculations");
            createTaxCalculationSheet(taxSheet, data, headerStyle, currencyStyle);

            // Trip Log
            if (data.getTrips() != null) {
                Sheet tripsSheet = workbook.createSheet("Travel_Logbook");
                createTripsSheet(tripsSheet, data.getTrips(), headerStyle);
            }

            // Expenses with classification
            if (data.getExpenses() != null) {
                Sheet expensesSheet = workbook.createSheet("Expenses");
                createExpensesSheet(expensesSheet, data.getExpenses(), headerStyle, currencyStyle);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            log.error("Error generating enhanced SARS logbook Excel", e);
            throw new RuntimeException("Failed to generate enhanced SARS logbook Excel", e);
        }
    }

    private CellStyle createSarsSubmissionStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setBorderBottom(BorderStyle.MEDIUM);
        return style;
    }

    private void createSarsSubmissionSheet(Sheet sheet, SarsLogbookExportDTO data,
                                          CellStyle headerStyle, CellStyle currencyStyle, CellStyle sarsStyle) {
        // Phase 9: SARS-specific submission format for eFiling
        int rowNum = 0;

        // Header Section
        Row titleRow = sheet.createRow(rowNum++);
        titleRow.createCell(0).setCellValue("SARS TRAVEL LOGBOOK - TAX RETURN SUBMISSION");
        titleRow.getCell(0).setCellStyle(sarsStyle);

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("Tax Year: " + data.getTaxYear() + "/" + (data.getTaxYear() + 1));
        sheet.createRow(rowNum++).createCell(0).setCellValue("Period: 1 March " + data.getTaxYear() + " to 28 February " + (data.getTaxYear() + 1));

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("VEHICLE DETAILS");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Registration Number: " + data.getVehicleRegistration());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Make: " + data.getVehicleMake());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Model: " + data.getVehicleModel());

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("ODOMETER READINGS");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Opening Odometer (1 March): " + data.getOpeningOdometer());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Closing Odometer (28 Feb): " + data.getClosingOdometer());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Total Kilometres: " + data.getTotalKm());

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("BUSINESS USE SUMMARY");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Business Kilometres: " + data.getBusinessKm());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Private Kilometres: " + data.getPrivateKm());
  sheet.createRow(rowNum++).createCell(0).setCellValue("Business Use Percentage: " + data.getBusinessPercentage() + "%");
  sheet.createRow(rowNum++).createCell(0).setCellValue("Selected Tax Method: " + data.getSelectedCalculationMethod());
  sheet.createRow(rowNum++).createCell(0).setCellValue("Deduction (ZAR): " + data.getDeductibleExpenses());
  sheet.createRow(rowNum++).createCell(0).setCellValue("Formula: " + data.getDeductionFormula());

  rowNum++;
  sheet.createRow(rowNum++).createCell(0).setCellValue("DATA QUALITY STATUS");
  sheet.createRow(rowNum++).createCell(0).setCellValue("Odometer Drift Status: Checked before export");
  sheet.createRow(rowNum++).createCell(0).setCellValue("Submission Valid: YES (active drift blocked this export)");

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("DECLARATION");
        sheet.createRow(rowNum++).createCell(0).setCellValue("I declare that the information provided is true and correct to the best of my knowledge.");
    }

    private void createTaxCalculationSheet(Sheet sheet, SarsLogbookExportDTO data,
                                         CellStyle headerStyle, CellStyle currencyStyle) {
        // Phase 10: Tax calculation comparison sheet with actual calculations
        int rowNum = 0;
        Row titleRow = sheet.createRow(rowNum++);
        titleRow.createCell(0).setCellValue("TAX CALCULATION METHOD COMPARISON");
        titleRow.getCell(0).setCellStyle(headerStyle);

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("Vehicle: " + data.getVehicleRegistration());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Tax Year: " + data.getTaxYear());

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("INPUT DATA");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Business KM: " + data.getBusinessKm());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Private KM: " + data.getPrivateKm());
        sheet.createRow(rowNum++).createCell(0).setCellValue("Business Use Percentage: " + data.getBusinessPercentage() + "%");

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("CALCULATION METHODS");

        // Method 1: Actual Costs
        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("1. ACTUAL COSTS METHOD");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Description: Based on actual qualifying expenses incurred");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Formula: (Business KM / Total KM) × Qualifying Expenses");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Best for: Fleet vehicles with accurate expense tracking");

        // Method 2: SARS Cost Scale
        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("2. SARS COST SCALE METHOD");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Description: Based on vehicle value brackets (9-tier system)");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Formula: Vehicle Value × Bracket Rate × Business Use %");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Best for: Vehicles with known asset value");

        // Method 3: Simplified Reimbursive (AA Rates)
        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("3. SIMPLIFIED REIMBURSIVE (AA RATES)");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Description: Fixed rate per business kilometre");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Formula: Business KM × R4.95/km (2027 AA Rate)");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Best for: Solo individuals with accurate trip logs");

        rowNum++;
        sheet.createRow(rowNum++).createCell(0).setCellValue("RECOMMENDATION");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Choose the method that provides the highest legitimate deduction");
        sheet.createRow(rowNum++).createCell(0).setCellValue("while maintaining compliance with SARS requirements.");
    }
}
