package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.ReportExportDTO;
import za.co.fleetexpense.dto.ReportExportRequest;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.PermissionService;
import za.co.fleetexpense.service.ReportExportService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/report-exports")
@RequiredArgsConstructor
public class ReportExportController {

    private final ReportExportService reportExportService;
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<ReportExportDTO> requestExport(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ReportExportRequest request) {
        if (!permissionService.isAllowed(principal.getOrganizationId(), "REPORT_EXPORT", "VIEW_REPORT_EXPORTS", principal.getRole().name())) {
            return ResponseEntity.status(403).build();
        }
        ReportExportDTO export = reportExportService.requestExport(
            principal.getOrganizationId(),
            principal.getId(),
            request
        );
        return ResponseEntity.ok(export);
    }

    @GetMapping
    public ResponseEntity<List<ReportExportDTO>> getExports(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (!permissionService.isAllowed(principal.getOrganizationId(), "REPORT_EXPORT", "VIEW_REPORT_EXPORTS", principal.getRole().name())) {
            return ResponseEntity.status(403).build();
        }
        List<ReportExportDTO> exports = reportExportService.getExportsByOrganization(
            principal.getOrganizationId()
        );
        return ResponseEntity.ok(exports);
    }

    @GetMapping("/{exportId}")
    public ResponseEntity<ReportExportDTO> getExport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID exportId) {
        if (!permissionService.isAllowed(principal.getOrganizationId(), "REPORT_EXPORT", "VIEW_REPORT_EXPORTS", principal.getRole().name())) {
            return ResponseEntity.status(403).build();
        }
        ReportExportDTO export = reportExportService.getExport(
            exportId,
            principal.getOrganizationId()
        );
        return ResponseEntity.ok(export);
    }

    @DeleteMapping("/{exportId}")
    public ResponseEntity<Void> deleteExport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID exportId) {
        if (!permissionService.isAllowed(principal.getOrganizationId(), "REPORT_EXPORT", "VIEW_REPORT_EXPORTS", principal.getRole().name())) {
            return ResponseEntity.status(403).build();
        }
        reportExportService.deleteExport(
            exportId,
            principal.getOrganizationId(),
            principal.getId()
        );
        return ResponseEntity.noContent().build();
    }
}
