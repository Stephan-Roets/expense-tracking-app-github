package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.RecurringExpenseCreateRequest;
import za.co.fleetexpense.dto.RecurringExpenseDTO;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.RecurringExpenseService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recurring-expenses")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class RecurringExpenseController {

    private final RecurringExpenseService recurringExpenseService;

    @GetMapping
    public ResponseEntity<List<RecurringExpenseDTO>> getAll(@AuthenticationPrincipal UserPrincipal principal) {
        List<RecurringExpenseDTO> expenses = recurringExpenseService.getAllByOrganization(principal.getOrganizationId());
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<RecurringExpenseDTO>> getByVehicle(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID vehicleId) {
        List<RecurringExpenseDTO> expenses = recurringExpenseService.getByVehicle(principal.getOrganizationId(), vehicleId);
        return ResponseEntity.ok(expenses);
    }

    @GetMapping("/vehicle/{vehicleId}/active")
    public ResponseEntity<List<RecurringExpenseDTO>> getActiveByVehicle(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID vehicleId) {
        List<RecurringExpenseDTO> expenses = recurringExpenseService.getActiveByVehicle(principal.getOrganizationId(), vehicleId);
        return ResponseEntity.ok(expenses);
    }

    @PostMapping
    public ResponseEntity<RecurringExpenseDTO> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody RecurringExpenseCreateRequest request) {
        RecurringExpenseDTO expense = recurringExpenseService.create(request, principal.getOrganizationId());
        return ResponseEntity.ok(expense);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecurringExpenseDTO> getById(@PathVariable UUID id) {
        RecurringExpenseDTO expense = recurringExpenseService.getById(id);
        return ResponseEntity.ok(expense);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        recurringExpenseService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/generate")
    public ResponseEntity<String> generateExpenses(
            @AuthenticationPrincipal UserPrincipal principal) {
        int generated = recurringExpenseService.generateExpensesFromRecurring(
            principal.getOrganizationId(),
            java.time.LocalDate.now()
        );
        return ResponseEntity.ok("Generated " + generated + " expenses");
    }
}
