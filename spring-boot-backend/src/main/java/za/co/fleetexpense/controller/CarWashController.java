package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.CarWash;
import za.co.fleetexpense.service.CarWashService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/car-washes")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class CarWashController {

    private final CarWashService carWashService;

    @GetMapping("/expense/{expenseId}")
    public ResponseEntity<CarWash> getCarWashByExpense(@PathVariable UUID expenseId) {
        return ResponseEntity.ok(carWashService.getByExpenseId(expenseId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarWash> getCarWashById(@PathVariable UUID id) {
        return ResponseEntity.ok(carWashService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<CarWash> createCarWash(@RequestBody CarWash carWash) {
        return ResponseEntity.ok(carWashService.create(carWash));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<CarWash> updateCarWash(
            @PathVariable UUID id,
            @RequestBody CarWash carWash) {
        return ResponseEntity.ok(carWashService.update(id, carWash));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteCarWash(@PathVariable UUID id) {
        carWashService.delete(id);
        return ResponseEntity.ok().build();
    }
}
