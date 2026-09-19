package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.Tyre;
import za.co.fleetexpense.service.TyreService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tyres")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class TyreController {

    private final TyreService tyreService;

    @GetMapping("/expense/{expenseId}")
    public ResponseEntity<Tyre> getTyreByExpense(@PathVariable UUID expenseId) {
        return ResponseEntity.ok(tyreService.getByExpenseId(expenseId));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<Tyre>> getTyresByVehicle(@PathVariable UUID vehicleId) {
        return ResponseEntity.ok(tyreService.getByVehicle(vehicleId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tyre> getTyreById(@PathVariable UUID id) {
        return ResponseEntity.ok(tyreService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Tyre> createTyre(@RequestBody Tyre tyre) {
        return ResponseEntity.ok(tyreService.create(tyre));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Tyre> updateTyre(
            @PathVariable UUID id,
            @RequestBody Tyre tyre) {
        return ResponseEntity.ok(tyreService.update(id, tyre));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteTyre(@PathVariable UUID id) {
        tyreService.delete(id);
        return ResponseEntity.ok().build();
    }
}
