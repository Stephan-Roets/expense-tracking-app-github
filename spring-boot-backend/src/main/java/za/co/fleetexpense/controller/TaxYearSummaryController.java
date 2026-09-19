package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.TaxYearSummaryDTO;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.TaxYearSummaryService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tax-year-summaries")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class TaxYearSummaryController {

    private final TaxYearSummaryService taxYearSummaryService;

    // ==================== CRUD OPERATIONS ====================

    @GetMapping
    public ResponseEntity<List<TaxYearSummaryDTO>> getAllSummaries(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(taxYearSummaryService.getByOrganization(principal.getOrganizationId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaxYearSummaryDTO> getSummaryById(@PathVariable UUID id) {
        return ResponseEntity.ok(taxYearSummaryService.getById(id));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<TaxYearSummaryDTO>> getSummariesByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(taxYearSummaryService.getByVehicle(vehicleId));
    }

    @GetMapping("/vehicle/{vehicleId}/tax-year/{taxYear}")
    public ResponseEntity<TaxYearSummaryDTO> getSummaryByVehicleAndYear(
            @PathVariable UUID vehicleId,
            @PathVariable Integer taxYear) {
        return ResponseEntity.ok(taxYearSummaryService.getByVehicleAndYear(vehicleId, taxYear));
    }

    @GetMapping("/tax-year/{taxYear}")
    public ResponseEntity<List<TaxYearSummaryDTO>> getSummariesByYear(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Integer taxYear) {
        return ResponseEntity.ok(taxYearSummaryService.getByOrganizationAndYear(principal.getOrganizationId(), taxYear));
    }

    @PostMapping("/calculate/vehicle/{vehicleId}/tax-year/{taxYear}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<TaxYearSummaryDTO> calculateSummary(
            @PathVariable UUID vehicleId,
            @PathVariable Integer taxYear,
            @AuthenticationPrincipal UserPrincipal principal) {
        TaxYearSummaryDTO calculated = taxYearSummaryService.calculateSummary(
                vehicleId, taxYear, principal.getOrganizationId());
        return ResponseEntity.status(HttpStatus.CREATED).body(calculated);
    }

    // ==================== SARS REPORTING ENDPOINTS ====================

    @GetMapping("/sars/vehicle/{vehicleId}/tax-year/{taxYear}")
    public ResponseEntity<Map<String, Object>> getSarsLogbookData(
            @PathVariable UUID vehicleId,
            @PathVariable int taxYear) {
        Map<String, Object> data = taxYearSummaryService.getSarsLogbookData(vehicleId, taxYear);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/sars/organization/tax-year/{taxYear}")
    public ResponseEntity<Map<String, Object>> getOrganizationSarsSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable int taxYear) {
        Map<String, Object> summary = taxYearSummaryService.getOrganizationSarsSummary(
                principal.getOrganizationId(), taxYear);
        return ResponseEntity.ok(summary);
    }
}
