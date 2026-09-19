package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.RecurringTripCreateRequest;
import za.co.fleetexpense.dto.RecurringTripDTO;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.RecurringTripService;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recurring-trips")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class RecurringTripController {

    private final RecurringTripService recurringTripService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<List<RecurringTripDTO>> getAllRecurringTrips(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<RecurringTripDTO> recurringTrips = recurringTripService.getAllByOrganization(principal.getOrganizationId());
        return ResponseEntity.ok(recurringTrips);
    }

    @GetMapping("/vehicle/{vehicleId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<List<RecurringTripDTO>> getRecurringTripsByVehicle(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<RecurringTripDTO> recurringTrips = recurringTripService.getByVehicle(principal.getOrganizationId(), vehicleId);
        return ResponseEntity.ok(recurringTrips);
    }

    @GetMapping("/vehicle/{vehicleId}/active")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<List<RecurringTripDTO>> getActiveRecurringTripsByVehicle(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<RecurringTripDTO> recurringTrips = recurringTripService.getActiveByVehicle(principal.getOrganizationId(), vehicleId);
        return ResponseEntity.ok(recurringTrips);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<RecurringTripDTO> createRecurringTrip(
            @RequestBody RecurringTripCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        RecurringTripDTO recurringTrip = recurringTripService.create(request, principal.getOrganizationId(), principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(recurringTrip);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<RecurringTripDTO> getRecurringTrip(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        RecurringTripDTO recurringTrip = recurringTripService.getById(id);
        return ResponseEntity.ok(recurringTrip);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Map<String, String>> deleteRecurringTrip(@PathVariable UUID id) {
        recurringTripService.delete(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Recurring trip deleted successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate/{date}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Map<String, String>> generateTripsForDate(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate date,
            @AuthenticationPrincipal UserPrincipal principal) {
        recurringTripService.generateTripsFromRecurring(principal.getOrganizationId(), date);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Trips generated for date: " + date);
        return ResponseEntity.ok(response);
    }
}
