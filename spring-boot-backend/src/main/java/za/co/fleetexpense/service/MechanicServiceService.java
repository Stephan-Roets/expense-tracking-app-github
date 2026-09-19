package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.MechanicService;
import za.co.fleetexpense.entity.enums.ServiceType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.MechanicServiceRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MechanicServiceService {

    private final MechanicServiceRepository mechanicServiceRepository;
    private final ExpenseRepository expenseRepository;

    public MechanicService getById(UUID id) {
        return mechanicServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mechanic service not found: " + id));
    }

    public MechanicService getByExpenseId(UUID expenseId) {
        return mechanicServiceRepository.findByExpenseId(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Mechanic service not found for expense: " + expenseId));
    }

    public List<MechanicService> getByVehicle(UUID vehicleId) {
        return mechanicServiceRepository.findByVehicle(vehicleId);
    }

    public List<MechanicService> getByOrganizationAndType(UUID orgId, ServiceType type) {
        return mechanicServiceRepository.findByOrganizationAndType(orgId, type);
    }

    @Transactional
    public MechanicService create(MechanicService mechanicService) {
        if (mechanicService.getExpense() == null || mechanicService.getExpense().getId() == null) {
            throw new IllegalArgumentException("Expense is required");
        }

        mechanicService.setExpense(expenseRepository.findById(mechanicService.getExpense().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found")));

        MechanicService saved = mechanicServiceRepository.save(mechanicService);
        log.info("Created mechanic service {} for expense {}", saved.getId(), mechanicService.getExpense().getId());
        return saved;
    }

    @Transactional
    public MechanicService update(UUID id, MechanicService updatedService) {
        MechanicService existing = getById(id);

        existing.setServiceType(updatedService.getServiceType());
        existing.setWorkshopName(updatedService.getWorkshopName());
        existing.setWorkshopPhone(updatedService.getWorkshopPhone());
        existing.setWorkshopAddress(updatedService.getWorkshopAddress());
        existing.setTechnicianName(updatedService.getTechnicianName());
        existing.setWorkDescription(updatedService.getWorkDescription());
        existing.setPartsReplaced(updatedService.getPartsReplaced());
        existing.setPartsCostZar(updatedService.getPartsCostZar());
        existing.setLaborCostZar(updatedService.getLaborCostZar());
        existing.setWarrantyMonths(updatedService.getWarrantyMonths());
        existing.setNextServiceDueKm(updatedService.getNextServiceDueKm());
        existing.setNextServiceDueDate(updatedService.getNextServiceDueDate());

        MechanicService saved = mechanicServiceRepository.save(existing);
        log.info("Updated mechanic service {}", id);
        return saved;
    }

    @Transactional
    public MechanicService update(MechanicService mechanicService) {
        if (mechanicService.getId() == null) {
            throw new IllegalArgumentException("Mechanic service ID is required for update");
        }

        MechanicService existing = getById(mechanicService.getId());

        existing.setServiceType(mechanicService.getServiceType());
        existing.setWorkshopName(mechanicService.getWorkshopName());
        existing.setWorkshopPhone(mechanicService.getWorkshopPhone());
        existing.setWorkshopAddress(mechanicService.getWorkshopAddress());
        existing.setTechnicianName(mechanicService.getTechnicianName());
        existing.setWorkDescription(mechanicService.getWorkDescription());
        existing.setPartsReplaced(mechanicService.getPartsReplaced());
        existing.setPartsCostZar(mechanicService.getPartsCostZar());
        existing.setLaborCostZar(mechanicService.getLaborCostZar());
        existing.setWarrantyMonths(mechanicService.getWarrantyMonths());
        existing.setNextServiceDueKm(mechanicService.getNextServiceDueKm());
        existing.setNextServiceDueDate(mechanicService.getNextServiceDueDate());

        MechanicService saved = mechanicServiceRepository.save(existing);
        log.info("Updated mechanic service {}", mechanicService.getId());
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        MechanicService service = getById(id);
        mechanicServiceRepository.delete(service);
        log.info("Deleted mechanic service {}", id);
    }
}
