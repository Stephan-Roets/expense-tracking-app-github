package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.MaintenanceTopup;
import za.co.fleetexpense.entity.enums.MaintenanceItemType;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.MaintenanceTopupService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/maintenance-topups")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class MaintenanceTopupController {

    private final MaintenanceTopupService maintenanceTopupService;

    @GetMapping("/expense/{expenseId}")
    public ResponseEntity<MaintenanceTopup> getMaintenanceTopupByExpense(@PathVariable UUID expenseId) {
        return ResponseEntity.ok(maintenanceTopupService.getByExpenseId(expenseId));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<MaintenanceTopup>> getMaintenanceTopupsByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(maintenanceTopupService.getByVehicle(vehicleId));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<MaintenanceTopup>> getMaintenanceTopupsByType(
            @PathVariable MaintenanceItemType type) {
        return ResponseEntity.ok(maintenanceTopupService.getByItemType(type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceTopup> getMaintenanceTopupById(@PathVariable UUID id) {
        return ResponseEntity.ok(maintenanceTopupService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<MaintenanceTopup> createMaintenanceTopup(
            @RequestBody MaintenanceTopup maintenanceTopup,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(maintenanceTopupService.create(maintenanceTopup, principal.getOrganizationId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<MaintenanceTopup> updateMaintenanceTopup(
            @PathVariable UUID id,
            @RequestBody MaintenanceTopup maintenanceTopup) {
        return ResponseEntity.ok(maintenanceTopupService.update(id, maintenanceTopup));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteMaintenanceTopup(@PathVariable UUID id) {
        maintenanceTopupService.delete(id);
        return ResponseEntity.ok().build();
    }
}
