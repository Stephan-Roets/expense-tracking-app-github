package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.MaintenanceTopup;
import za.co.fleetexpense.entity.enums.MaintenanceItemType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.MaintenanceTopupRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceTopupService {

    private final MaintenanceTopupRepository maintenanceTopupRepository;
    private final ExpenseRepository expenseRepository;

    public MaintenanceTopup getById(UUID id) {
        return maintenanceTopupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance topup not found: " + id));
    }

    public MaintenanceTopup getByExpenseId(UUID expenseId) {
        return maintenanceTopupRepository.findByExpenseId(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance topup not found for expense: " + expenseId));
    }

    public List<MaintenanceTopup> getByVehicle(UUID vehicleId) {
        return maintenanceTopupRepository.findByVehicle(vehicleId);
    }

    public List<MaintenanceTopup> getByItemType(MaintenanceItemType type) {
        return maintenanceTopupRepository.findByItemType(type);
    }

    @Transactional
    public MaintenanceTopup create(MaintenanceTopup topup, UUID organizationId) {
        if (topup.getExpense() == null || topup.getExpense().getId() == null) {
            throw new IllegalArgumentException("Expense is required");
        }

        topup.setExpense(expenseRepository.findById(topup.getExpense().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found")));

        MaintenanceTopup saved = maintenanceTopupRepository.save(topup);
        log.info("Created maintenance topup {} for expense {}", saved.getId(), topup.getExpense().getId());
        return saved;
    }

    @Transactional
    public MaintenanceTopup update(UUID id, MaintenanceTopup updatedTopup) {
        MaintenanceTopup existing = getById(id);

        existing.setItemType(updatedTopup.getItemType());
        existing.setItemBrand(updatedTopup.getItemBrand());
        existing.setItemQuantity(updatedTopup.getItemQuantity());
        existing.setItemUnit(updatedTopup.getItemUnit());
        existing.setShopName(updatedTopup.getShopName());
        existing.setNotes(updatedTopup.getNotes());

        MaintenanceTopup saved = maintenanceTopupRepository.save(existing);
        log.info("Updated maintenance topup {}", id);
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        MaintenanceTopup topup = getById(id);
        maintenanceTopupRepository.delete(topup);
        log.info("Deleted maintenance topup {}", id);
    }
}
