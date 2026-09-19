package za.co.fleetexpense.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.ExportReportCreateRequest;
import za.co.fleetexpense.dto.ExportReportDTO;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.service.ExportReportService;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/export-reports")
@RequiredArgsConstructor
public class ExportReportController {

    private final ExportReportService exportReportService;

    @PostMapping
    public ResponseEntity<ExportReportDTO> createExportReport(
            @RequestBody ExportReportCreateRequest request,
            @AuthenticationPrincipal User user) {
        ExportReportDTO report = exportReportService.createExportReport(request, user);
        return ResponseEntity.ok(report);
    }

    @GetMapping
    public ResponseEntity<List<ExportReportDTO>> getExportReports(
            @AuthenticationPrincipal User user) {
        List<ExportReportDTO> reports = exportReportService.getExportReportsByOrganization(user);
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExportReportDTO> getExportReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        ExportReportDTO report = exportReportService.getExportReport(id, user);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/{id}/download")
    public void downloadExportReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            HttpServletResponse response) throws IOException {
        byte[] fileBytes = exportReportService.downloadExportReport(id, user);
        
        ExportReportDTO report = exportReportService.getExportReport(id, user);
        
        response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, 
            "attachment; filename=\"" + report.fileName() + "\"");
        response.setContentLength(fileBytes.length);
        
        response.getOutputStream().write(fileBytes);
        response.getOutputStream().flush();
    }
}
