package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.FuelLogCreateRequest;
import za.co.fleetexpense.dto.FuelLogDTO;
import za.co.fleetexpense.dto.FuelLogUpdateRequest;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.FuelLogService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/fuel-logs")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class FuelLogController {

    private final FuelLogService fuelLogService;
    private final ObjectMapper objectMapper;

    // ==================== CRUD OPERATIONS ====================

    @GetMapping("/expense/{expenseId}")
    public ResponseEntity<FuelLogDTO> getFuelLogByExpense(@PathVariable UUID expenseId) {
        return ResponseEntity.ok(fuelLogService.getByExpenseId(expenseId));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<FuelLogDTO>> getFuelLogsByVehicle(@PathVariable UUID vehicleId, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(fuelLogService.getByVehicle(vehicleId, principal.getUserId(), principal.getRole()));
    }

    @GetMapping("/organization")
    public ResponseEntity<List<FuelLogDTO>> getFuelLogsByOrganization(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(fuelLogService.getByOrganization(principal.getOrganizationId(), principal.getUserId(), principal.getRole()));
    }

    @PostMapping
    public ResponseEntity<FuelLogDTO> createFuelLog(
            @Valid @RequestBody FuelLogCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        FuelLogDTO created = fuelLogService.create(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Create fuel expense with receipt image and optional GPS coordinates
     * Used by frontend fuel purchase form with multipart upload
     */
    @PostMapping(value = "/expense", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FuelLogDTO> createFuelExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) throws Exception {
        
        FuelLogCreateRequest request = objectMapper.readValue(dataJson, FuelLogCreateRequest.class);
        
        FuelLogDTO created = fuelLogService.create(request, principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<FuelLogDTO> updateFuelLog(
            @PathVariable UUID id,
            @Valid @RequestBody FuelLogUpdateRequest request) {
        return ResponseEntity.ok(fuelLogService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteFuelLog(@PathVariable UUID id) {
        fuelLogService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== CONSUMPTION OPERATIONS ====================

    @PostMapping("/{id}/calculate-consumption")
    public ResponseEntity<FuelLogDTO> calculateConsumption(@PathVariable UUID id) {
        return ResponseEntity.ok(fuelLogService.calculateConsumption(id));
    }

    // ==================== ANALYTICS ENDPOINTS ====================

    @GetMapping("/vehicle/{vehicleId}/statistics")
    public ResponseEntity<Map<String, BigDecimal>> getVehicleFuelStatistics(@PathVariable UUID vehicleId) {
        Map<String, BigDecimal> stats = fuelLogService.getVehicleFuelStatistics(vehicleId);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/vehicle/{vehicleId}/average-consumption")
    public ResponseEntity<BigDecimal> getVehicleAverageConsumption(@PathVariable UUID vehicleId) {
        BigDecimal avgConsumption = fuelLogService.getAverageConsumptionForVehicle(vehicleId);
        return ResponseEntity.ok(avgConsumption);
    }
}
