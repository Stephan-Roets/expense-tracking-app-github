package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.ExportRequest;
import za.co.fleetexpense.entity.enums.ExportFormat;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.EmailService;
import za.co.fleetexpense.service.ExportService;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exports")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;
    private final EmailService emailService;

    /**
     * Export SARS logbook in multiple formats (Excel, PDF, HTML)
     */
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        System.out.println("Test endpoint reached!");
        return ResponseEntity.ok("Test endpoint working");
    }

    @PostMapping("/test")
    public ResponseEntity<String> testPostEndpoint(@RequestBody String body) {
        System.out.println("Test POST endpoint reached! Body: " + body);
        return ResponseEntity.ok("Test POST endpoint working");
    }

    @PostMapping("/export")
    public ResponseEntity<byte[]> exportSarsLogbook(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        byte[] exportData = exportService.exportSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = generateFilename(request);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(request.getFormat().getMimeType()))
                .body(exportData);
    }

    /**
     * Preview SARS logbook as HTML (no download, for inline viewing)
     */
    @PostMapping(value = "/sars-logbook/preview", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> previewSarsLogbook(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        request.setFormat(ExportFormat.HTML);

        byte[] htmlBytes = exportService.exportSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(new String(htmlBytes));
    }

    /**
     * Quick export endpoints for specific formats
     */
    @PostMapping("/sars-logbook/excel")
    public ResponseEntity<byte[]> exportSarsLogbookExcel(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        request.setFormat(ExportFormat.EXCEL);

        byte[] excelData = exportService.exportSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = "SARS_Logbook_" + request.getTaxYear() + "_" + principal.getUsername() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(ExportFormat.EXCEL.getMimeType()))
                .body(excelData);
    }

    @PostMapping("/sars-logbook/pdf")
    public ResponseEntity<byte[]> exportSarsLogbookPdf(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        request.setFormat(ExportFormat.PDF);

        byte[] pdfData = exportService.exportSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = "SARS_Logbook_" + request.getTaxYear() + "_" + principal.getUsername() + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(ExportFormat.PDF.getMimeType()))
                .body(pdfData);
    }

    @PostMapping("/sars-logbook/html")
    public ResponseEntity<byte[]> exportSarsLogbookHtml(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        request.setFormat(ExportFormat.HTML);

        byte[] htmlData = exportService.exportSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = "SARS_Logbook_" + request.getTaxYear() + "_" + principal.getUsername() + ".html";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(ExportFormat.HTML.getMimeType()))
                .body(htmlData);
    }

    /**
     * Email SARS logbook export to specified address
     */
    @PostMapping("/sars-logbook/email")
    public ResponseEntity<Map<String, String>> emailSarsLogbook(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        byte[] exportData = exportService.exportSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = generateFilename(request);

        emailService.sendSarsLogbook(
                request.getEmail(), exportData, filename,
                principal.getUsername(), request.getTaxYear());

        Map<String, String> response = new HashMap<>();
        response.put("message", "SARS logbook export queued for email delivery to " + request.getEmail() +
                ". (SMTP not configured in dev — check backend console logs.)");
        response.put("status", "queued");

        return ResponseEntity.ok().body(response);
    }

    /**
     * Export trip records in CSV or Excel format
     */
    @PostMapping("/trips")
    public ResponseEntity<byte[]> exportTrips(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        byte[] exportData = exportService.exportTrips(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = "Trip_Export_" + request.getTaxYear() + "_" + principal.getUsername() +
                "." + request.getFormat().getExtension();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(request.getFormat().getMimeType()))
                .body(exportData);
    }

    /**
     * Phase 9: Dedicated SARS submission export - formatted specifically for SARS eFiling
     * This is a separate, dedicated export for SARS tax return submission
     */
    @PostMapping("/sars-submission")
    public ResponseEntity<byte[]> exportSarsSubmission(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        // Force Excel format for SARS submission
        request.setFormat(ExportFormat.EXCEL);

        byte[] exportData = exportService.exportSarsSubmission(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = "SARS_Submission_" + request.getTaxYear() + "_" + principal.getUsername() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(ExportFormat.EXCEL.getMimeType()))
                .body(exportData);
    }

    /**
     * Phase 10: Enhanced existing export with SARS-specific tax summary data
     * This enhances the standard SARS logbook export to include tax calculation details
     */
    @PostMapping("/sars-logbook/enhanced")
    public ResponseEntity<byte[]> exportEnhancedSarsLogbook(
            @Valid @RequestBody ExportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        byte[] exportData = exportService.exportEnhancedSarsLogbook(
                request, principal.getOrganizationId(), principal.getUsername(), principal.getRole().name());

        String filename = "SARS_Enhanced_Logbook_" + request.getTaxYear() + "_" + principal.getUsername() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(ExportFormat.EXCEL.getMimeType()))
                .body(exportData);
    }

    private String generateFilename(ExportRequest request) {
        String baseName = "SARS_Logbook_" + request.getTaxYear();
        String extension = request.getFormat().getExtension();
        return baseName + "." + extension;
    }
}
