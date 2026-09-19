package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.RecurringExpenseCreateRequest;
import za.co.fleetexpense.dto.RecurringExpenseDTO;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.RecurringExpense;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.RecurringExpenseMapper;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.RecurringExpenseRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringExpenseService {

    private final RecurringExpenseRepository recurringExpenseRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final RecurringExpenseMapper recurringExpenseMapper;
    private final ExpenseRepository expenseRepository;

    public List<RecurringExpenseDTO> getAllByOrganization(UUID organizationId) {
        List<RecurringExpense> recurringExpenses = recurringExpenseRepository.findByOrganizationId(organizationId);
        return recurringExpenses.stream()
                .map(recurringExpenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RecurringExpenseDTO> getByVehicle(UUID organizationId, UUID vehicleId) {
        List<RecurringExpense> recurringExpenses = recurringExpenseRepository.findByOrganizationIdAndVehicleId(organizationId, vehicleId);
        // Initialize lazy-loaded entities to avoid LazyInitializationException
        recurringExpenses.forEach(expense -> {
            if (expense.getVehicle() != null) {
                org.hibernate.Hibernate.initialize(expense.getVehicle());
            }
            if (expense.getUser() != null) {
                org.hibernate.Hibernate.initialize(expense.getUser());
            }
        });
        return recurringExpenses.stream()
                .map(recurringExpenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RecurringExpenseDTO> getActiveByVehicle(UUID organizationId, UUID vehicleId) {
        List<RecurringExpense> recurringExpenses = recurringExpenseRepository.findActiveByOrganizationAndVehicle(organizationId, vehicleId);
        // Initialize lazy-loaded entities to avoid LazyInitializationException
        recurringExpenses.forEach(expense -> {
            if (expense.getVehicle() != null) {
                org.hibernate.Hibernate.initialize(expense.getVehicle());
            }
            if (expense.getUser() != null) {
                org.hibernate.Hibernate.initialize(expense.getUser());
            }
        });
        return recurringExpenses.stream()
                .map(recurringExpenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public RecurringExpenseDTO create(RecurringExpenseCreateRequest request, UUID organizationId) {
        // Validate user exists - use provided userId or get from authenticated user
        User user;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        } else {
            // Get authenticated user from security context
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
                String email = ((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal()).getUsername();
                user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            } else {
                throw new ResourceNotFoundException("User not found - no authenticated user");
            }
        }

        // Validate vehicle if provided
        if (request.getVehicleId() != null) {
            vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        }

        // Validate recurrence settings
        if (Boolean.TRUE.equals(request.getIsRecurring())) {
            if (request.getRecurrenceDays() == null || request.getRecurrenceDays().trim().isEmpty()) {
                throw new ValidationException("Recurrence days are required when expense is recurring");
            }
            if (request.getRecurrenceStartDate() == null) {
                throw new ValidationException("Recurrence start date is required when expense is recurring");
            }
            validateRecurrenceDays(request.getRecurrenceDays());
        }

        // Map request to entity
        RecurringExpense recurringExpense = recurringExpenseMapper.toEntity(request);
        recurringExpense.setOrganization(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found")));
        recurringExpense.setUser(user);

        RecurringExpense saved = recurringExpenseRepository.save(recurringExpense);
        log.info("Created recurring expense {} for user {}", saved.getId(), user.getId());
        return recurringExpenseMapper.toDTO(saved);
    }

    @Transactional
    public int generateExpensesFromRecurring(UUID organizationId, LocalDate date) {
        List<RecurringExpense> recurringExpenses = recurringExpenseRepository.findActiveRecurringExpensesForDate(organizationId, date);
        int generatedCount = 0;

        for (RecurringExpense recurringExpense : recurringExpenses) {
            if (shouldGenerateExpenseForDate(recurringExpense, date)) {
                generateExpenseFromRecurring(recurringExpense, date);
                generatedCount++;
            }
        }
        return generatedCount;
    }

    private boolean shouldGenerateExpenseForDate(RecurringExpense recurringExpense, LocalDate date) {
        // Check if expense already exists for this date
        List<Expense> existingExpenses = expenseRepository.findByOrganizationIdAndExpenseDate(
                recurringExpense.getOrganization().getId(), date);
        
        // Filter for same category and user
        boolean alreadyExists = existingExpenses.stream()
                .anyMatch(exp -> exp.getCategory() == recurringExpense.getCategory() 
                        && exp.getUser().getId().equals(recurringExpense.getUser().getId())
                        && (recurringExpense.getVehicle() == null || 
                            (exp.getVehicle() != null && exp.getVehicle().getId().equals(recurringExpense.getVehicle().getId()))));
        
        if (alreadyExists) {
            return false;
        }

        // Check if date matches recurrence days
        if (Boolean.TRUE.equals(recurringExpense.getIsRecurring())) {
            DayOfWeek dayOfWeek = date.getDayOfWeek();
            String dayName = dayOfWeek.name().substring(0, 3).toUpperCase(); // MON, TUE, etc.
            
            // Check day of week
            boolean matchesDayOfWeek = recurringExpense.getRecurrenceDays() != null && 
                recurringExpense.getRecurrenceDays().contains(dayName);
            
            // Check day of month if specified
            boolean matchesDayOfMonth = false;
            if (recurringExpense.getRecurrenceDaysOfMonth() != null && 
                !recurringExpense.getRecurrenceDaysOfMonth().trim().isEmpty()) {
                int dayOfMonth = date.getDayOfMonth();
                String[] daysOfMonth = recurringExpense.getRecurrenceDaysOfMonth().split(",");
                for (String day : daysOfMonth) {
                    if (day.trim().equals(String.valueOf(dayOfMonth))) {
                        matchesDayOfMonth = true;
                        break;
                    }
                }
            }
            
            // If both are specified, both must match. If only one is specified, that one must match.
            if (recurringExpense.getRecurrenceDaysOfMonth() != null && 
                !recurringExpense.getRecurrenceDaysOfMonth().trim().isEmpty()) {
                return matchesDayOfWeek && matchesDayOfMonth;
            }
            return matchesDayOfWeek;
        }

        return false;
    }

    @Transactional
    protected void generateExpenseFromRecurring(RecurringExpense recurringExpense, LocalDate date) {
        // Create expense entity from recurring template
        Expense expense = Expense.builder()
                .organization(recurringExpense.getOrganization())
                .vehicle(recurringExpense.getVehicle())
                .user(recurringExpense.getUser())
                .category(recurringExpense.getCategory())
                .expenseDate(date)
                .amountZar(recurringExpense.getAmountZar())
                .vatAmountZar(recurringExpense.getVatAmountZar() != null ? recurringExpense.getVatAmountZar() : java.math.BigDecimal.ZERO)
                .description(recurringExpense.getDescription())
                .supplierName(recurringExpense.getSupplierName())
                .invoiceNumber(recurringExpense.getInvoiceNumber())
                .isTaxDeductible(recurringExpense.getIsTaxDeductible() != null ? recurringExpense.getIsTaxDeductible() : true)
                .odometerReading(recurringExpense.getOdometerReading())
                .build();

        expenseRepository.save(expense);
        log.info("Generated expense {} from recurring template {} for date {}", expense.getId(), recurringExpense.getId(), date);
    }

    private void validateRecurrenceDays(String recurrenceDays) {
        List<String> validDays = Arrays.asList("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");
        String[] days = recurrenceDays.split(",");
        
        for (String day : days) {
            String trimmedDay = day.trim().toUpperCase();
            if (!validDays.contains(trimmedDay)) {
                throw new ValidationException("Invalid recurrence day: " + trimmedDay + ". Valid days are: MON, TUE, WED, THU, FRI, SAT, SUN");
            }
        }
    }

    public RecurringExpenseDTO getById(UUID id) {
        RecurringExpense recurringExpense = recurringExpenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring expense not found: " + id));
        return recurringExpenseMapper.toDTO(recurringExpense);
    }

    @Transactional
    public void delete(UUID id) {
        RecurringExpense recurringExpense = recurringExpenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring expense not found: " + id));
        recurringExpenseRepository.delete(recurringExpense);
        log.info("Deleted recurring expense {}", id);
    }
}
