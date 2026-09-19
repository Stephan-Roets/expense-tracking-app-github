package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.CarWash;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.CarWashRepository;
import za.co.fleetexpense.repository.ExpenseRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CarWashService {

    private final CarWashRepository carWashRepository;
    private final ExpenseRepository expenseRepository;

    public CarWash getById(UUID id) {
        return carWashRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Car wash not found: " + id));
    }

    public CarWash getByExpenseId(UUID expenseId) {
        return carWashRepository.findByExpenseId(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Car wash not found for expense: " + expenseId));
    }

    @Transactional
    public CarWash create(CarWash carWash) {
        if (carWash.getExpense() == null || carWash.getExpense().getId() == null) {
            throw new IllegalArgumentException("Expense is required");
        }

        carWash.setExpense(expenseRepository.findById(carWash.getExpense().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found")));

        CarWash saved = carWashRepository.save(carWash);
        log.info("Created car wash {} for expense {}", saved.getId(), carWash.getExpense().getId());
        return saved;
    }

    @Transactional
    public CarWash update(UUID id, CarWash updatedCarWash) {
        CarWash existing = getById(id);

        existing.setWashType(updatedCarWash.getWashType());
        existing.setWashName(updatedCarWash.getWashName());
        existing.setWashLocation(updatedCarWash.getWashLocation());
        existing.setInteriorCleaned(updatedCarWash.getInteriorCleaned());
        existing.setExteriorCleaned(updatedCarWash.getExteriorCleaned());
        existing.setEngineCleaned(updatedCarWash.getEngineCleaned());
        existing.setNotes(updatedCarWash.getNotes());

        CarWash saved = carWashRepository.save(existing);
        log.info("Updated car wash {}", id);
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        CarWash carWash = getById(id);
        carWashRepository.delete(carWash);
        log.info("Deleted car wash {}", id);
    }
}
