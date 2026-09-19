package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.Tyre;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.TyreRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TyreService {

    private final TyreRepository tyreRepository;
    private final ExpenseRepository expenseRepository;

    public Tyre getById(UUID id) {
        return tyreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tyre not found: " + id));
    }

    public Tyre getByExpenseId(UUID expenseId) {
        return tyreRepository.findByExpenseId(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Tyre not found for expense: " + expenseId));
    }

    public List<Tyre> getByVehicle(UUID vehicleId) {
        return tyreRepository.findByVehicle(vehicleId);
    }

    @Transactional
    public Tyre create(Tyre tyre) {
        if (tyre.getExpense() == null || tyre.getExpense().getId() == null) {
            throw new IllegalArgumentException("Expense is required");
        }

        tyre.setExpense(expenseRepository.findById(tyre.getExpense().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found")));

        Tyre saved = tyreRepository.save(tyre);
        log.info("Created tyre {} for expense {}", saved.getId(), tyre.getExpense().getId());
        return saved;
    }

    @Transactional
    public Tyre update(UUID id, Tyre updatedTyre) {
        Tyre existing = getById(id);

        existing.setBrand(updatedTyre.getBrand());
        existing.setModel(updatedTyre.getModel());
        existing.setSize(updatedTyre.getSize());
        existing.setQuantity(updatedTyre.getQuantity());
        existing.setPosition(updatedTyre.getPosition());
        existing.setPurchaseOdometer(updatedTyre.getPurchaseOdometer());
        existing.setTreadDepthMm(updatedTyre.getTreadDepthMm());
        existing.setExpectedLifespanKm(updatedTyre.getExpectedLifespanKm());
        existing.setRotationIntervalKm(updatedTyre.getRotationIntervalKm());
        existing.setWarrantyKm(updatedTyre.getWarrantyKm());
        existing.setNotes(updatedTyre.getNotes());

        Tyre saved = tyreRepository.save(existing);
        log.info("Updated tyre {}", id);
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        Tyre tyre = getById(id);
        tyreRepository.delete(tyre);
        log.info("Deleted tyre {}", id);
    }
}
