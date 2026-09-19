package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.MechanicService;
import za.co.fleetexpense.entity.enums.ServiceType;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.MechanicServiceService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/mechanic-services")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class MechanicServiceController {

    private final MechanicServiceService mechanicServiceService;

    @GetMapping("/expense/{expenseId}")
    public ResponseEntity<MechanicService> getMechanicServiceByExpense(@PathVariable UUID expenseId) {
        return ResponseEntity.ok(mechanicServiceService.getByExpenseId(expenseId));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<MechanicService>> getMechanicServicesByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(mechanicServiceService.getByVehicle(vehicleId));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<MechanicService>> getMechanicServicesByType(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable ServiceType type) {
        return ResponseEntity.ok(mechanicServiceService.getByOrganizationAndType(principal.getOrganizationId(), type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MechanicService> getMechanicServiceById(@PathVariable UUID id) {
        return ResponseEntity.ok(mechanicServiceService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<MechanicService> createMechanicService(@RequestBody MechanicService mechanicService) {
        return ResponseEntity.ok(mechanicServiceService.create(mechanicService));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<MechanicService> updateMechanicService(
            @PathVariable UUID id,
            @RequestBody MechanicService mechanicService) {
        return ResponseEntity.ok(mechanicServiceService.update(id, mechanicService));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteMechanicService(@PathVariable UUID id) {
        mechanicServiceService.delete(id);
        return ResponseEntity.ok().build();
    }
}
