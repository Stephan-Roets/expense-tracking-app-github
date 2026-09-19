package za.co.fleetexpense.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.ReportExportDTO;
import za.co.fleetexpense.dto.ReportExportRequest;
import za.co.fleetexpense.dto.TaxCalculationResult;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.ReportExport;
import za.co.fleetexpense.entity.TaxCalculationSnapshot;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleTaxProfile;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.enums.ReportExportStatus;
import za.co.fleetexpense.enums.ReportExportType;
import za.co.fleetexpense.exception.ForbiddenException;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.mapper.ReportExportMapper;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.ReportExportRepository;
import za.co.fleetexpense.repository.TaxCalculationSnapshotRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExportService {

    private final ReportExportRepository reportExportRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final ReportExportMapper reportExportMapper;
    private final ExportService exportService;
    private final TaxCalculationSnapshotRepository taxCalculationSnapshotRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTaxProfileRepository vehicleTaxProfileRepository;
    private final TaxCalculationService taxCalculationService;
    private final ObjectMapper objectMapper;

    @Transactional
    public ReportExportDTO requestExport(UUID organizationId, UUID userId, ReportExportRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        FleetModeGuard.requireFleetMode(organization);

        // RBAC: OWNER + SUPER_ADMIN only
        if (user.getRole() != za.co.fleetexpense.entity.enums.UserRole.SUPER_ADMIN 
            && !organization.getOwnerId().equals(user.getId())) {
            throw new ForbiddenException("Only owners and super admins can request report exports");
        }

        // Validate date ranges
        if (request.getReportType() != ReportExportType.FLEET_SUMMARY) {
            if (request.getReportType() != ReportExportType.TAX_CALCULATION) {
                if (request.getDateFrom() == null || request.getDateTo() == null) {
                    throw new IllegalArgumentException("Date range is required for this report type");
                }
                if (request.getDateFrom().isAfter(request.getDateTo())) {
                    throw new IllegalArgumentException("Date from must be before or equal to date to");
                }
            } else {
                // Tax calculation specific validation
                if (request.getVehicleId() == null) {
                    throw new IllegalArgumentException("Vehicle ID is required for tax calculation export");
                }
                if (request.getTaxYear() == null) {
                    throw new IllegalArgumentException("Tax year is required for tax calculation export");
                }
            }
        }

        // Resolve calculation method for tax exports
        TaxCalculationMethod resolvedMethod = request.getCalculationMethod();
        if (request.getReportType() == ReportExportType.TAX_CALCULATION && resolvedMethod == null) {
            resolvedMethod = organization.getDefaultTaxCalculationMethod();
            if (resolvedMethod == null) {
                throw new IllegalArgumentException("Organization default tax calculation method not set");
            }
        }

        ReportExport reportExport = ReportExport.builder()
            .organization(organization)
            .requestedBy(user)
            .reportType(request.getReportType())
            .format(request.getFormat())
            .dateFrom(request.getDateFrom())
            .dateTo(request.getDateTo())
            .vehicleId(request.getVehicleId())
            .taxYear(request.getTaxYear())
            .calculationMethod(resolvedMethod)
            .status(ReportExportStatus.PENDING)
            .build();

        reportExport = reportExportRepository.save(reportExport);

        // Trigger async generation
        generateReportAsync(reportExport.getId());

        log.info("Report export requested: org={}, type={}, format={}, requestedBy={}", 
            organizationId, request.getReportType(), request.getFormat(), userId);

        return reportExportMapper.toDto(reportExport);
    }

    @Async
    @Transactional
    public void generateReportAsync(UUID reportExportId) {
        try {
            ReportExport reportExport = reportExportRepository.findById(reportExportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report export not found"));

            log.info("Starting async report generation: id={}, type={}", reportExportId, reportExport.getReportType());

            // Generate the report file
            String fileUrl = generateReportFile(reportExport);

            reportExport.setFileUrl(fileUrl);
            reportExport.setStatus(ReportExportStatus.COMPLETED);
            reportExport.setCompletedAt(OffsetDateTime.now());

            reportExportRepository.save(reportExport);

            log.info("Report export completed: id={}, fileUrl={}", reportExportId, fileUrl);

        } catch (Exception e) {
            log.error("Report export failed: id={}", reportExportId, e);

            ReportExport reportExport = reportExportRepository.findById(reportExportId)
                .orElse(null);

            if (reportExport != null) {
                reportExport.setStatus(ReportExportStatus.FAILED);
                reportExport.setErrorMessage(e.getMessage());
                reportExport.setCompletedAt(OffsetDateTime.now());
                reportExportRepository.save(reportExport);
            }
        }
    }

    private String generateReportFile(ReportExport reportExport) {
        if (reportExport.getReportType() == ReportExportType.TAX_CALCULATION) {
            return generateTaxCalculationReport(reportExport);
        }

        // Existing report generation for other types
        String fileName = String.format("%s_%s_%s.%s",
            reportExport.getReportType(),
            reportExport.getOrganization().getId(),
            reportExport.getCreatedAt().toInstant().toEpochMilli(),
            reportExport.getFormat().getExtension());

        String filePath = String.format("reports/%s/%s", 
            reportExport.getOrganization().getId(), fileName);

        // TODO: Implement actual report generation based on type
        // This would involve:
        // 1. Querying the appropriate data
        // 2. Generating the file (PDF/XLSX/CSV)
        // 3. Uploading to OCI
        // 4. Returning the URL

        return filePath;
    }

    private String generateTaxCalculationReport(ReportExport reportExport) {
        try {
            // Fetch vehicle and profile
            Vehicle vehicle = vehicleRepository.findById(reportExport.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            
            VehicleTaxProfile profile = taxCalculationService.findProfileForTaxYear(
                reportExport.getVehicleId(),
                reportExport.getTaxYear()
            );
            
            if (profile == null) {
                throw new ResourceNotFoundException("Vehicle tax profile not found for tax year");
            }

            // Calculate tax year boundaries
            LocalDate taxYearStart = LocalDate.of(reportExport.getTaxYear() - 1, 3, 1);
            LocalDate taxYearEnd = LocalDate.of(reportExport.getTaxYear(), 2, 28);
            if (taxYearEnd.isLeapYear()) {
                taxYearEnd = LocalDate.of(reportExport.getTaxYear(), 2, 29);
            }

            // Perform tax calculation using the resolved method
            TaxCalculationResult result;
            TaxCalculationMethod method = reportExport.getCalculationMethod();
            
            // Get km values from vehicle's tax year summary (placeholder - would need actual data)
            // For now, use placeholder values
            java.math.BigDecimal businessKm = java.math.BigDecimal.valueOf(10000);
            java.math.BigDecimal totalKm = java.math.BigDecimal.valueOf(20000);
            java.math.BigDecimal qualifyingCurrentExpenseCents = java.math.BigDecimal.valueOf(5000000L);

            switch (method) {
                case ACTUAL_COSTS:
                    result = taxCalculationService.calculateActualCosts(
                        profile, qualifyingCurrentExpenseCents, businessKm, totalKm,
                        taxYearStart, taxYearEnd
                    );
                    break;
                case SARS_COST_SCALE:
                    result = taxCalculationService.calculateSarsCostScale(
                        profile, taxYearStart, taxYearEnd, businessKm, totalKm
                    );
                    break;
                case SIMPLIFIED_REIMBURSIVE:
                    result = taxCalculationService.calculateSimplifiedReimbursive(
                        profile, taxYearStart, taxYearEnd, businessKm
                    );
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported tax calculation method: " + method);
            }

            // Capture SARS rate snapshot (inlined values, not a reference)
            String sarsRateSnapshotJson = captureSarsRateSnapshot(reportExport.getTaxYear(), method);

            // Create immutable snapshot
            TaxCalculationSnapshot snapshot = TaxCalculationSnapshot.builder()
                .vehicle(vehicle)
                .organization(reportExport.getOrganization())
                .taxYear(reportExport.getTaxYear())
                .selectedMethod(method)
                .inputsJson(objectMapper.writeValueAsString(createInputsJson(profile, businessKm, totalKm, qualifyingCurrentExpenseCents)))
                .resultJson(objectMapper.writeValueAsString(result))
                .sarsRateSnapshotJson(sarsRateSnapshotJson)
                .calculatedAt(OffsetDateTime.now())
                .calculatedByUser(reportExport.getRequestedBy())
                .export(reportExport)
                .build();

            taxCalculationSnapshotRepository.save(snapshot);

            // Generate file
            String fileName = String.format("tax_calculation_%s_%s_%s.%s",
                vehicle.getId(),
                reportExport.getTaxYear(),
                reportExport.getCreatedAt().toInstant().toEpochMilli(),
                reportExport.getFormat().getExtension());

            String filePath = String.format("reports/%s/%s", 
                reportExport.getOrganization().getId(), fileName);

            // TODO: Generate actual tax report file (PDF/XLSX/CSV)
            // TODO: Upload to OCI

            log.info("Tax calculation snapshot created: exportId={}, vehicleId={}, taxYear={}, method={}",
                reportExport.getId(), vehicle.getId(), reportExport.getTaxYear(), method);

            return filePath;

        } catch (Exception e) {
            log.error("Failed to generate tax calculation report: exportId={}", reportExport.getId(), e);
            throw new RuntimeException("Tax calculation report generation failed", e);
        }
    }

    private String captureSarsRateSnapshot(Integer taxYear, TaxCalculationMethod method) {
        try {
            // Capture the exact SARS bracket/rate values used (inlined, not a reference)
            java.util.Map<String, Object> snapshot = new java.util.HashMap<>();
            snapshot.put("taxYear", taxYear);
            snapshot.put("method", method.name());
            
            // TODO: Fetch and inline the actual bracket/rate values from the database
            // This would involve querying sars_cost_scale_brackets or sars_prescribed_rates
            // and inlining the exact values used in the calculation
            
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            log.error("Failed to capture SARS rate snapshot", e);
            return "{}";
        }
    }

    private java.util.Map<String, Object> createInputsJson(
            VehicleTaxProfile profile,
            java.math.BigDecimal businessKm,
            java.math.BigDecimal totalKm,
            java.math.BigDecimal qualifyingCurrentExpenseCents) {
        java.util.Map<String, Object> inputs = new java.util.HashMap<>();
        inputs.put("profileId", profile.getId());
        inputs.put("businessKm", businessKm);
        inputs.put("totalKm", totalKm);
        inputs.put("qualifyingCurrentExpenseCents", qualifyingCurrentExpenseCents);
        inputs.put("vehicleCostCents", profile.getVehicleCostCents());
        inputs.put("taxpayerType", profile.getTaxpayerType().name());
        inputs.put("compensationType", profile.getCompensationType().name());
        inputs.put("fuelBorneBy", profile.getFuelBorneBy());
        inputs.put("maintenanceBorneBy", profile.getMaintenanceBorneBy());
        inputs.put("coveredByMaintenancePlan", profile.getCoveredByMaintenancePlan());
        inputs.put("effectiveFrom", profile.getEffectiveFrom());
        inputs.put("effectiveTo", profile.getEffectiveTo());
        inputs.put("datePlacedInBusinessUse", profile.getDatePlacedInBusinessUse());
        return inputs;
    }

    @Transactional(readOnly = true)
    public List<ReportExportDTO> getExportsByOrganization(UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        // Remove fleet mode requirement - allow both fleet and individual accounts
        // FleetModeGuard.requireFleetMode(organization);

        List<ReportExport> exports = reportExportRepository.findByOrganizationId(organizationId);
        return exports.stream()
            .map(reportExportMapper::toDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public ReportExportDTO getExport(UUID exportId, UUID organizationId) {
        ReportExport export = reportExportRepository.findById(exportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report export not found"));

        if (!export.getOrganization().getId().equals(organizationId)) {
            throw new ForbiddenException("Export not found in your organization");
        }

        FleetModeGuard.requireFleetMode(export.getOrganization());

        return reportExportMapper.toDto(export);
    }

    @Transactional
    public void deleteExport(UUID exportId, UUID organizationId, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ReportExport export = reportExportRepository.findById(exportId)
            .orElseThrow(() -> new ResourceNotFoundException("Report export not found"));

        if (!export.getOrganization().getId().equals(organizationId)) {
            throw new ForbiddenException("Export not found in your organization");
        }

        FleetModeGuard.requireFleetMode(export.getOrganization());

        // RBAC: OWNER + SUPER_ADMIN only
        if (user.getRole() != za.co.fleetexpense.entity.enums.UserRole.SUPER_ADMIN 
            && !export.getOrganization().getOwnerId().equals(user.getId())) {
            throw new ForbiddenException("Only owners and super admins can delete report exports");
        }

        reportExportRepository.delete(export);
        log.info("Report export deleted: id={}, deletedBy={}", exportId, userId);
    }
}
