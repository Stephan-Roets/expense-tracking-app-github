package za.co.fleetexpense.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.ExportReportCreateRequest;
import za.co.fleetexpense.dto.ExportReportDTO;
import za.co.fleetexpense.entity.ExportReport;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.enums.ExportReportFormat;
import za.co.fleetexpense.enums.ExportReportType;
import za.co.fleetexpense.exception.ForbiddenException;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.mapper.ExportReportMapper;
import za.co.fleetexpense.repository.ExportReportRepository;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.TripRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExportReportService {

    private final ExportReportRepository exportReportRepository;
    private final ExportReportMapper exportReportMapper;
    private final VehicleRepository vehicleRepository;
    private final ExpenseRepository expenseRepository;
    private final TripRepository tripRepository;
    private final ObjectMapper objectMapper;

    private static final String EXPORT_DIR = "exports";

    public ExportReportDTO createExportReport(ExportReportCreateRequest request, User user) {
        FleetModeGuard.requireFleetMode(user.getOrganization());

        // Validate date range for reports that require it
        if (request.reportType() == ExportReportType.EXPENSE_REPORT 
            || request.reportType() == ExportReportType.TRIP_LOG) {
            if (request.dateFrom() == null || request.dateTo() == null) {
                throw new IllegalArgumentException("Date range is required for this report type");
            }
            if (request.dateFrom().isAfter(request.dateTo())) {
                throw new IllegalArgumentException("dateFrom must be before dateTo");
            }
        }

        String vehicleIdsJson = null;
        if (request.vehicleIds() != null && !request.vehicleIds().isEmpty()) {
            try {
                vehicleIdsJson = objectMapper.writeValueAsString(request.vehicleIds());
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize vehicle IDs", e);
                throw new RuntimeException("Failed to process vehicle IDs");
            }
        }

        ExportReport exportReport = ExportReport.builder()
            .organization(user.getOrganization())
            .requestedBy(user)
            .reportType(request.reportType())
            .reportFormat(request.reportFormat())
            .dateFrom(request.dateFrom())
            .dateTo(request.dateTo())
            .vehicleIds(vehicleIdsJson)
            .status("PENDING")
            .build();

        ExportReport saved = exportReportRepository.save(exportReport);
        
        // Process asynchronously
        processExportReportAsync(saved.getId());

        return exportReportMapper.toDto(saved);
    }

    @Async
    @Transactional
    public void processExportReportAsync(UUID exportReportId) {
        ExportReport exportReport = exportReportRepository.findById(exportReportId)
            .orElseThrow(() -> new ResourceNotFoundException("Export report not found"));

        try {
            exportReport.setStatus("PROCESSING");
            exportReportRepository.save(exportReport);

            String fileName = generateFileName(exportReport);
            String filePath = generateFile(exportReport, fileName);

            File file = new File(filePath);
            exportReport.setFilePath(filePath);
            exportReport.setFileName(fileName);
            exportReport.setFileSizeBytes(file.length());
            exportReport.setDownloadUrl("/api/export-reports/" + exportReportId + "/download");
            exportReport.setStatus("COMPLETED");
            exportReport.setCompletedAt(OffsetDateTime.now());

            log.info("Export report {} completed: {}", exportReportId, fileName);

        } catch (Exception e) {
            log.error("Failed to process export report {}", exportReportId, e);
            exportReport.setStatus("FAILED");
            exportReport.setErrorMessage(e.getMessage());
        }

        exportReportRepository.save(exportReport);
    }

    @Transactional(readOnly = true)
    public List<ExportReportDTO> getExportReportsByOrganization(User user) {
        FleetModeGuard.requireFleetMode(user.getOrganization());
        
        List<ExportReport> reports = exportReportRepository.findByOrganizationIdOrderByCreatedAtDesc(user.getOrganization().getId());
        return exportReportMapper.toDtoList(reports);
    }

    @Transactional(readOnly = true)
    public ExportReportDTO getExportReport(UUID id, User user) {
        ExportReport report = exportReportRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Export report not found"));

        FleetModeGuard.requireFleetMode(report.getOrganization());

        if (!report.getOrganization().getId().equals(user.getOrganization().getId())) {
            throw new ForbiddenException("You do not have access to this export report");
        }

        return exportReportMapper.toDto(report);
    }

    public byte[] downloadExportReport(UUID id, User user) {
        ExportReport report = exportReportRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Export report not found"));

        FleetModeGuard.requireFleetMode(report.getOrganization());

        if (!report.getOrganization().getId().equals(user.getOrganization().getId())) {
            throw new ForbiddenException("You do not have access to this export report");
        }

        if (!"COMPLETED".equals(report.getStatus())) {
            throw new IllegalStateException("Export report is not ready for download");
        }

        try {
            Path path = Paths.get(report.getFilePath());
            return Files.readAllBytes(path);
        } catch (IOException e) {
            log.error("Failed to read export file {}", report.getFilePath(), e);
            throw new RuntimeException("Failed to download export file");
        }
    }

    private String generateFileName(ExportReport exportReport) {
        String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        String type = exportReport.getReportType().name().toLowerCase();
        String format = exportReport.getReportFormat().name().toLowerCase();
        return String.format("%s-%s.%s", type, timestamp, format);
    }

    private String generateFile(ExportReport exportReport, String fileName) throws IOException {
        // Create export directory if it doesn't exist
        Path exportDir = Paths.get(EXPORT_DIR);
        if (!Files.exists(exportDir)) {
            Files.createDirectories(exportDir);
        }

        Path filePath = exportDir.resolve(fileName);

        // Generate content based on report type and format
        String content = generateReportContent(exportReport);
        Files.writeString(filePath, content);

        return filePath.toString();
    }

    private String generateReportContent(ExportReport exportReport) {
        // This is a simplified implementation
        // In production, use proper report generation libraries:
        // - PDF: Apache PDFBox, iText
        // - Excel: Apache POI
        // - CSV: Simple CSV writer

        StringBuilder sb = new StringBuilder();
        sb.append("Export Report: ").append(exportReport.getReportType()).append("\n");
        sb.append("Format: ").append(exportReport.getReportFormat()).append("\n");
        sb.append("Generated: ").append(OffsetDateTime.now()).append("\n");
        sb.append("Organization: ").append(exportReport.getOrganization().getName()).append("\n");

        if (exportReport.getDateFrom() != null) {
            sb.append("Date From: ").append(exportReport.getDateFrom()).append("\n");
        }
        if (exportReport.getDateTo() != null) {
            sb.append("Date To: ").append(exportReport.getDateTo()).append("\n");
        }

        // Add report-specific content
        switch (exportReport.getReportType()) {
            case FLEET_SUMMARY -> generateFleetSummaryContent(sb, exportReport);
            case EXPENSE_REPORT -> generateExpenseReportContent(sb, exportReport);
            case TRIP_LOG -> generateTripLogContent(sb, exportReport);
            case ODOMETER_DRIFT -> generateOdometerDriftContent(sb, exportReport);
            case VEHICLE_CONDITION -> generateVehicleConditionContent(sb, exportReport);
        }

        return sb.toString();
    }

    private void generateFleetSummaryContent(StringBuilder sb, ExportReport exportReport) {
        var vehicles = vehicleRepository.findByOrganizationId(exportReport.getOrganization().getId());
        sb.append("\n=== Fleet Summary ===\n");
        sb.append("Total Vehicles: ").append(vehicles.size()).append("\n");
        for (var vehicle : vehicles) {
            sb.append("- ").append(vehicle.getRegistrationNumber())
              .append(" (").append(vehicle.getMake()).append(" ").append(vehicle.getModel()).append(")\n");
        }
    }

    private void generateExpenseReportContent(StringBuilder sb, ExportReport exportReport) {
        // Use date range for filtering
        var expenses = expenseRepository.findByOrganizationIdAndExpenseDateBetween(
            exportReport.getOrganization().getId(),
            exportReport.getDateFrom().toLocalDate(),
            exportReport.getDateTo().toLocalDate()
        );
        sb.append("\n=== Expense Report ===\n");
        sb.append("Total Expenses: ").append(expenses.size()).append("\n");
        for (var expense : expenses) {
            sb.append("- ").append(expense.getCategory())
              .append(": R").append(expense.getAmountZar()).append("\n");
        }
    }

    private void generateTripLogContent(StringBuilder sb, ExportReport exportReport) {
        // Use date range for filtering
        var trips = tripRepository.findByOrganizationIdAndTripDateBetween(
            exportReport.getOrganization().getId(),
            exportReport.getDateFrom().toLocalDate(),
            exportReport.getDateTo().toLocalDate()
        );
        sb.append("\n=== Trip Log ===\n");
        sb.append("Total Trips: ").append(trips.size()).append("\n");
        for (var trip : trips) {
            sb.append("- ").append(trip.getTripDate())
              .append(": ").append(trip.getDistanceKm()).append(" km\n");
        }
    }

    private void generateOdometerDriftContent(StringBuilder sb, ExportReport exportReport) {
        sb.append("\n=== Odometer Drift Report ===\n");
        sb.append("Report generation not yet implemented.\n");
    }

    private void generateVehicleConditionContent(StringBuilder sb, ExportReport exportReport) {
        sb.append("\n=== Vehicle Condition Report ===\n");
        sb.append("Report generation not yet implemented.\n");
    }
}
