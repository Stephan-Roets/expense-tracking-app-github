package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.TripCreateRequest;
import za.co.fleetexpense.dto.TripDTO;
import za.co.fleetexpense.dto.TripUpdateRequest;
import za.co.fleetexpense.entity.enums.TripPurpose;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.TripService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trips")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    // ==================== CRUD OPERATIONS ====================

    @GetMapping
    public ResponseEntity<List<TripDTO>> getAllTrips(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tripService.getAllByOrganization(principal.getOrganizationId(), principal.getUserId(), principal.getRole()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripDTO> getTripById(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tripService.getById(id, principal.getUserId(), principal.getRole()));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<TripDTO>> getTripsByVehicle(@PathVariable UUID vehicleId, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tripService.getByVehicle(vehicleId, principal.getUserId(), principal.getRole()));
    }

    @GetMapping("/vehicle/{vehicleId}/last-odometer")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<Map<String, Object>> getLastOdometerReading(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> lastOdometer = tripService.getLastOdometerReading(vehicleId, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(lastOdometer);
    }

    @GetMapping("/vehicle/{vehicleId}/latest-business-odometer")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<Integer> getLatestBusinessTripOdometer(
            @PathVariable UUID vehicleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate tripDate,
            @RequestParam(required = false) String startTime,
            @AuthenticationPrincipal UserPrincipal principal) {
        Integer latestOdometer = tripService.getLatestBusinessTripEndOdometer(vehicleId, tripDate, startTime, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(latestOdometer);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getTripsSummary(
            @RequestParam(required = false) UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Use database view for efficient trip statistics calculation
        Map<String, Object> summary = tripService.getTripSummary(vehicleId, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/date-range")
    public ResponseEntity<List<TripDTO>> getTripsByDateRange(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(tripService.getByDateRange(principal.getOrganizationId(), start, end, principal.getUserId(), principal.getRole()));
    }

    @GetMapping("/purpose/{purpose}")
    public ResponseEntity<List<TripDTO>> getTripsByPurpose(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable TripPurpose purpose) {
        return ResponseEntity.ok(tripService.getByPurpose(principal.getOrganizationId(), purpose, principal.getUserId(), principal.getRole()));
    }

    @PostMapping
    public ResponseEntity<TripDTO> createTrip(
            @Valid @RequestBody TripCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        TripDTO created = tripService.create(request, principal.getOrganizationId(), principal.getUserId(), principal.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TripDTO> updateTrip(
            @PathVariable UUID id,
            @Valid @RequestBody TripUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tripService.update(id, request, principal.getOrganizationId(), principal.getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTrip(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        tripService.delete(id, principal.getOrganizationId(), principal.getRole());
        return ResponseEntity.ok(Map.of("success", true, "message", "Trip deleted successfully"));
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<TripDTO> lockTrip(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(tripService.toggleLock(id, true, principal.getUserId(), reason));
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<TripDTO> unlockTrip(@PathVariable UUID id) {
        return ResponseEntity.ok(tripService.toggleLock(id, false, null, null));
    }

    // ==================== SARS COMPLIANCE ENDPOINTS ====================

    @GetMapping("/vehicle/{vehicleId}/sars-summary/{taxYear}")
    public ResponseEntity<Map<String, Object>> getSarsLogbookSummary(
            @PathVariable UUID vehicleId,
            @PathVariable int taxYear,
            @AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> summary = tripService.getSarsLogbookSummary(vehicleId, taxYear, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/vehicle/{vehicleId}/sars-logbook/{taxYear}")
    public ResponseEntity<List<TripDTO>> getSarsLogbookEntries(
            @PathVariable UUID vehicleId,
            @PathVariable int taxYear,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<TripDTO> entries = tripService.getSarsLogbookEntries(vehicleId, taxYear, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/sars/non-compliant/{taxYear}")
    public ResponseEntity<List<TripDTO>> getNonCompliantTrips(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable int taxYear) {
        List<TripDTO> nonCompliant = tripService.getNonCompliantTrips(principal.getOrganizationId(), taxYear, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(nonCompliant);
    }

    @GetMapping("/{id}/sars-compliant")
    public ResponseEntity<Boolean> isSarsCompliant(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        boolean compliant = tripService.isSarsCompliant(id, principal.getUserId(), principal.getRole());
        return ResponseEntity.ok(compliant);
    }
}
