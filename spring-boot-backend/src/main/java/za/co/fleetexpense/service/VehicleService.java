package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.FleetAssignmentHistoryDTO;
import za.co.fleetexpense.dto.FleetOdometerStatusDTO;
import za.co.fleetexpense.dto.VehicleCreateRequest;
import za.co.fleetexpense.dto.VehicleDTO;
import za.co.fleetexpense.dto.VehicleUpdateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleConditionImage;
import za.co.fleetexpense.entity.enums.ExpiryItemType;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.entity.enums.VehicleStatus;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.VehicleMapper;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.FuelLogRepository;
import za.co.fleetexpense.repository.OdometerConfirmationRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.UserAssistantRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleAssignmentRepository;
import za.co.fleetexpense.repository.VehicleConditionReportRepository;
import za.co.fleetexpense.repository.VehicleRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final FuelLogRepository fuelLogRepository;
    private final ExpenseRepository expenseRepository;
    private final VehicleMapper vehicleMapper;
    private final ExpiryAlertService expiryAlertService;
    private final OdometerDriftAlertService odometerDriftAlertService;
    private final UserAssistantRepository userAssistantRepository;
    private final PermissionService permissionService;
    private final VehicleAssignmentRepository vehicleAssignmentRepository;
    private final OdometerConfirmationRepository odometerConfirmationRepository;
    private final VehicleConditionReportRepository vehicleConditionReportRepository;

    @Value("${odometer.computed:false}")
    private boolean useComputedOdometer;

    // ==================== DTO-BASED CRUD OPERATIONS ====================

    public List<VehicleDTO> getAllByOrganization(UUID organizationId, UUID userId, UserRole role) {
        // Check if user is an individual account assistant (via user_assistants table)
        List<za.co.fleetexpense.entity.UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        boolean isIndividualAssistant = !assistantRelationships.isEmpty();

        List<Vehicle> vehicles;
        if (isIndividualAssistant) {
            // Individual assistants see owner's vehicles (filtered by assistant constraints)
            za.co.fleetexpense.entity.UserAssistant relationship = assistantRelationships.get(0);
            if (relationship.getAssignedVehicleId() != null) {
                // Only show the assigned vehicle
                vehicles = vehicleRepository.findById(relationship.getAssignedVehicleId())
                    .map(List::of)
                    .orElse(List.of());
            } else {
                // Show all vehicles if no specific assignment
                vehicles = vehicleRepository.findByOrganizationIdAndIsActiveTrue(organizationId);
            }
        } else if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            vehicles = vehicleRepository.findByOrganizationIdAndAssignedDriverIdAndIsActiveTrue(organizationId, userId);
        } else {
            vehicles = vehicleRepository.findByOrganizationIdAndIsActiveTrue(organizationId);
        }
        populateComputedOdometers(vehicles);
        return vehicles.stream()
                .map(vehicleMapper::toDTO)
                .collect(Collectors.toList());
    }

    public List<VehicleDTO> getRejectedVehicles(UUID organizationId, UserRole role) {
        if (role == UserRole.DRIVER) {
            return List.of(); // Drivers don't see rejected vehicles
        }
        List<Vehicle> rejectedVehicles = vehicleRepository.findByOrganizationIdAndRejectionReasonIsNotNullAndIsActiveFalse(organizationId);
        return rejectedVehicles.stream()
                .map(vehicleMapper::toDTO)
                .collect(Collectors.toList());
    }

    public VehicleDTO getById(UUID id, UUID userId, UserRole role) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
        if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found with id: " + id);
            }
        }
        populateComputedOdometer(vehicle);
        return vehicleMapper.toDTO(vehicle);
    }

    @Transactional
    public VehicleDTO create(VehicleCreateRequest request, UUID organizationId, UUID userId, UserRole creatorRole) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        // Check for duplicate registration number (only active vehicles)
        if (vehicleRepository.existsByOrganizationIdAndRegistrationNumberAndIsActiveTrue(organizationId, request.getRegistrationNumber())) {
            throw new ValidationException("Vehicle with registration number " + request.getRegistrationNumber() + " already exists");
        }

        // Map request to entity
        Vehicle vehicle = vehicleMapper.toEntity(request);
        vehicle.setOrganization(organization);

        // Handle assigned driver
        if (request.getAssignedDriverId() != null) {
            // Fleet mode: assign specified driver
            User driver = userRepository.findById(request.getAssignedDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));
            vehicle.setAssignedDriver(driver);
        } else if (organization.getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            // SOLO mode: auto-assign the creating user as owner/driver
            User owner = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            vehicle.setAssignedDriver(owner);
        }

        // Set defaults
        vehicle.setIsActive(true);
        vehicle.setIsLocked(false);
        vehicle.setCurrentOdometer(request.getCurrentOdometer() != null ? request.getCurrentOdometer() : 0);

        // Set status based on organization mode and role:
        // - SOLO mode: always active (no approval needed)
        // - FLEET mode: Managers need approval, Admins are auto-approved
        if (organization.getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            vehicle.setStatus(VehicleStatus.ACTIVE);
        } else if (creatorRole == UserRole.MANAGER) {
            vehicle.setStatus(VehicleStatus.PENDING_CREATION);
        } else {
            vehicle.setStatus(VehicleStatus.ACTIVE);
        }

        Vehicle saved = vehicleRepository.save(vehicle);

        // Create licence expiry alert if license expiry date is provided (only for active vehicles)
        if (saved.getStatus() == VehicleStatus.ACTIVE && saved.getLicenseExpiry() != null) {
            try {
                expiryAlertService.createAlert(
                    organizationId,
                    ExpiryItemType.VEHICLE_LICENSE.name(),
                    saved.getId(),
                    saved.getRegistrationNumber(),
                    "Vehicle license disc",
                    saved.getId(),
                    null,
                    saved.getLicenseExpiry()
                );
                log.info("Created licence expiry alert for vehicle {}", saved.getId());
            } catch (Exception e) {
                log.error("Failed to create licence expiry alert for vehicle {}: {}", saved.getId(), e.getMessage());
            }
        }

        log.info("Created vehicle {} for organization {} with status {}", saved.getId(), organizationId, saved.getStatus());
        return vehicleMapper.toDTO(saved);
    }

    @Transactional
    public VehicleDTO update(UUID id, VehicleUpdateRequest request, UUID organizationId, UUID userId, UserRole updaterRole) {
        Vehicle existing = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked vehicle");
        }

        // If vehicle was rejected, clear rejection fields and set it back to pending creation
        if (!existing.getIsActive() && existing.getRejectionReason() != null) {
            existing.setRejectionReason(null);
            existing.setRejectedAt(null);
            existing.setRejectedByUser(null);
            existing.setIsActive(true);
            existing.setStatus(VehicleStatus.PENDING_CREATION);
            log.info("Resubmitting rejected vehicle {} for approval", id);
        }

        // Handle driver update if provided
        if (request.getAssignedDriverId() != null) {
            User driver = userRepository.findById(request.getAssignedDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

            // Verify driver belongs to the organization
            if (!driver.getOrganization().getId().equals(organizationId)) {
                throw new ValidationException("Driver does not belong to this organization");
            }

            // Role-based assignment logic only applies to FLEET mode organizations
            // SOLO mode organizations can assign freely (typically owner to themselves)
            log.info("Organization mode: {}, Updater role: {}, Driver role: {}", 
                existing.getOrganization().getMode(), updaterRole, driver.getRole());
            if (existing.getOrganization().getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.BUSINESS_FLEET || existing.getOrganization().getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.COMPANY) {
                // - ADMIN and SUPER_ADMIN can assign to DRIVER, MANAGER, and RENTAL_CUSTOMER
                // - MANAGER can assign to DRIVER and RENTAL_CUSTOMER
                if (updaterRole == UserRole.MANAGER && driver.getRole() != UserRole.DRIVER && driver.getRole() != UserRole.RENTAL_CUSTOMER) {
                    throw new ValidationException("Managers can only assign vehicles to users with DRIVER or RENTAL_CUSTOMER role");
                }
                if (driver.getRole() != UserRole.DRIVER && driver.getRole() != UserRole.MANAGER && driver.getRole() != UserRole.RENTAL_CUSTOMER) {
                    throw new ValidationException("Can only assign vehicles to users with DRIVER, MANAGER, or RENTAL_CUSTOMER role");
                }
            }

            existing.setAssignedDriver(driver);
        } else if (request.getAssignedDriverId() == null) {
            existing.setAssignedDriver(null);
        }

        // Apply updates using mapper
        vehicleMapper.updateEntity(existing, request);

        Vehicle saved = vehicleRepository.save(existing);

        // Handle licence expiry alert updates - only for active vehicles
        if (request.getLicenseExpiry() != null && saved.getStatus() == VehicleStatus.ACTIVE) {
            try {
                // Check if alert already exists
                var existingAlerts = expiryAlertService.getByVehicle(id);
                boolean alertExists = existingAlerts.stream()
                    .anyMatch(alert -> alert.getItemType().equals(ExpiryItemType.VEHICLE_LICENSE.name()));

                if (alertExists) {
                    // Update existing alert
                    expiryAlertService.undismissAlertByItem(ExpiryItemType.VEHICLE_LICENSE.name(), id, userId);
                    log.info("Updated licence expiry alert for vehicle {}", id);
                } else {
                    // Create new alert
                    expiryAlertService.createAlert(
                        organizationId,
                        ExpiryItemType.VEHICLE_LICENSE.name(),
                        saved.getId(),
                        saved.getRegistrationNumber(),
                        "Vehicle license disc",
                        saved.getId(),
                        null,
                        saved.getLicenseExpiry()
                    );
                    log.info("Created licence expiry alert for vehicle {}", id);
                }
            } catch (Exception e) {
                log.error("Failed to update licence expiry alert for vehicle {}: {}", id, e.getMessage());
            }
        }
        
        log.info("Updated vehicle {}", id);
        return vehicleMapper.toDTO(saved);
    }

    @Transactional
    public void delete(UUID id, UUID organizationId, UserRole deleterRole) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        if (Boolean.TRUE.equals(vehicle.getIsLocked())) {
            throw new ValidationException("Cannot delete locked vehicle");
        }

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        // Deletion logic based on organization mode and role:
        // - SOLO mode: immediate deletion (no approval needed)
        // - FLEET mode: Managers mark for deletion (pending), Admins delete immediately
        if (organization.getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.SOLO) {
            vehicle.setIsActive(false);
            vehicleRepository.save(vehicle);
            log.info("Soft deleted vehicle {} in SOLO mode", id);
        } else if (deleterRole == UserRole.MANAGER) {
            vehicle.setStatus(VehicleStatus.PENDING_DELETION);
            vehicleRepository.save(vehicle);
            log.info("Manager marked vehicle {} for deletion (pending approval)", id);
        } else {
            vehicle.setIsActive(false);
            vehicleRepository.save(vehicle);
            log.info("Admin soft deleted vehicle {}", id);
        }
    }

    @Transactional
    public VehicleDTO toggleLock(UUID id, boolean locked, UUID userId, String reason) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));

        vehicle.setIsLocked(locked);
        if (locked) {
            vehicle.setLockedAt(java.time.OffsetDateTime.now());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            vehicle.setLockedByUser(user);
            vehicle.setLockedReason(reason);
        } else {
            vehicle.setLockedAt(null);
            vehicle.setLockedByUser(null);
            vehicle.setLockedReason(null);
        }

        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("{} vehicle {}", locked ? "Locked" : "Unlocked", id);
        return vehicleMapper.toDTO(saved);
    }

    // ==================== BUSINESS LOGIC METHODS ====================

    /**
     * Get fuel statistics for a vehicle
     */
    public Map<String, BigDecimal> getFuelStatistics(UUID vehicleId) {
        Map<String, BigDecimal> stats = new HashMap<>();

        List<za.co.fleetexpense.entity.FuelLog> fuelLogs = fuelLogRepository.findByVehicleOrderByDateDesc(vehicleId);

        if (fuelLogs.isEmpty()) {
            stats.put("totalLiters", BigDecimal.ZERO);
            stats.put("totalCost", BigDecimal.ZERO);
            stats.put("averageConsumption", BigDecimal.ZERO);
            stats.put("bestConsumption", BigDecimal.ZERO);
            stats.put("worstConsumption", BigDecimal.ZERO);
            return stats;
        }

        // Calculate totals
        BigDecimal totalLiters = fuelLogs.stream()
                .map(fl -> fl.getLiters() != null ? fl.getLiters() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = fuelLogs.stream()
                .map(fl -> {
                    if (fl.getLiters() != null && fl.getPricePerLiter() != null) {
                        return fl.getLiters().multiply(fl.getPricePerLiter());
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate consumption statistics
        List<BigDecimal> consumptions = fuelLogs.stream()
                .filter(fl -> fl.getConsumptionLPer100km() != null)
                .map(za.co.fleetexpense.entity.FuelLog::getConsumptionLPer100km)
                .collect(Collectors.toList());

        if (!consumptions.isEmpty()) {
            BigDecimal avgConsumption = consumptions.stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(consumptions.size()), 2, RoundingMode.HALF_UP);

            BigDecimal bestConsumption = consumptions.stream()
                    .min(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);

            BigDecimal worstConsumption = consumptions.stream()
                    .max(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);

            stats.put("averageConsumption", avgConsumption);
            stats.put("bestConsumption", bestConsumption);
            stats.put("worstConsumption", worstConsumption);
        } else {
            stats.put("averageConsumption", BigDecimal.ZERO);
            stats.put("bestConsumption", BigDecimal.ZERO);
            stats.put("worstConsumption", BigDecimal.ZERO);
        }

        stats.put("totalLiters", totalLiters);
        stats.put("totalCost", totalCost);
        stats.put("fuelLogCount", BigDecimal.valueOf(fuelLogs.size()));

        return stats;
    }

    /**
     * Get total expenses for a vehicle
     */
    public BigDecimal getTotalExpenses(UUID vehicleId) {
        List<za.co.fleetexpense.entity.Expense> expenses = expenseRepository.findByVehicleId(vehicleId);
        return expenses.stream()
                .map(e -> e.getAmountZar() != null ? e.getAmountZar() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Check if vehicle's license is expiring soon (within 30 days)
     */
    public boolean isLicenseExpiringSoon(UUID vehicleId, int daysThreshold) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (vehicle.getLicenseExpiry() == null) {
            return false;
        }

        java.time.LocalDate thresholdDate = java.time.LocalDate.now().plusDays(daysThreshold);
        return !vehicle.getLicenseExpiry().isAfter(thresholdDate);
    }

    /**
     * Update vehicle odometer reading
     */
    @Transactional
    public VehicleDTO updateOdometer(UUID vehicleId, Integer newOdometerReading) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Allow odometer corrections even when vehicle is locked
        // Odometer readings can be updated to correct mistakes regardless of lock status

        // Allow odometer corrections (new reading less than current) but log a warning
        if (newOdometerReading < vehicle.getCurrentOdometerStored()) {
            log.warn("Odometer correction: vehicle {} current odometer {} being reduced to {}", 
                vehicleId, vehicle.getCurrentOdometerStored(), newOdometerReading);
        }

        vehicle.setCurrentOdometer(newOdometerReading);
        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Updated odometer for vehicle {} to {} km", vehicleId, newOdometerReading);
        return vehicleMapper.toDTO(saved);
    }

    /**
     * Recalculate the vehicle's stored current_odometer baseline to match the highest odometer reading from expenses.
     * This syncs the manual fuel calculation baseline with reality.
     * Note: This does NOT auto-correct tyre purchase odometers. Users must manually edit tyre expenses if needed.
     */
    @Transactional
    public VehicleDTO recalculateCurrentOdometer(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Get the true MAX from expenses (includes FUEL_LOG, TIRES, scheduled MECHANIC_SERVICE)
        Integer computed = expenseRepository
                .findMaxOdometerIncludingDeleted(vehicleId)
                .orElse(vehicle.getCurrentOdometerStored());

        // Update the STORED baseline to match reality
        vehicle.setCurrentOdometer(computed);
        Vehicle saved = vehicleRepository.save(vehicle);

        // Auto-dismiss odometer drift alert after recalculating
        odometerDriftAlertService.deleteAlert(vehicleId);

        // Re-populate computed for the response
        populateComputedOdometer(saved);
        log.info("Recalculated odometer for vehicle {} from {} to {} km",
                vehicleId, vehicle.getCurrentOdometerStored(), computed);
        return vehicleMapper.toDTO(saved);
    }

    /**
     * Assign a driver to a vehicle
     */
    @Transactional
    public VehicleDTO assignDriver(UUID vehicleId, UUID driverId, UUID organizationId, UserRole assignerRole) {
        // Check ASSIGN_TO_DRIVER permission
        if (!permissionService.isAllowed(organizationId, "VEHICLE_ASSIGNMENT", "ASSIGN_TO_DRIVER", assignerRole.name())) {
            throw new ValidationException("You do not have permission to assign vehicles to drivers");
        }

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Verify vehicle belongs to the organization
        if (!vehicle.getOrganization().getId().equals(organizationId)) {
            throw new ValidationException("Vehicle does not belong to this organization");
        }

        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        // Verify driver belongs to the organization
        if (!driver.getOrganization().getId().equals(organizationId)) {
            throw new ValidationException("Driver does not belong to this organization");
        }

        // Role-based assignment logic only applies to FLEET mode organizations
        // SOLO mode organizations can assign freely (typically owner to themselves)
        if (vehicle.getOrganization().getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.BUSINESS_FLEET || vehicle.getOrganization().getMode() == za.co.fleetexpense.entity.enums.OrganizationMode.COMPANY) {
            // - ADMIN and SUPER_ADMIN can assign to DRIVER, MANAGER, and RENTAL_CUSTOMER
            // - MANAGER can assign to DRIVER and RENTAL_CUSTOMER
            if (assignerRole == UserRole.MANAGER && driver.getRole() != UserRole.DRIVER && driver.getRole() != UserRole.RENTAL_CUSTOMER) {
                throw new ValidationException("Managers can only assign vehicles to users with DRIVER or RENTAL_CUSTOMER role");
            }
            if (driver.getRole() != UserRole.DRIVER && driver.getRole() != UserRole.MANAGER && driver.getRole() != UserRole.RENTAL_CUSTOMER) {
                throw new ValidationException("Can only assign vehicles to users with DRIVER, MANAGER, or RENTAL_CUSTOMER role");
            }
        }

        vehicle.setAssignedDriver(driver);
        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Assigned driver {} to vehicle {} by {}", driverId, vehicleId, assignerRole);
        return vehicleMapper.toDTO(saved);
    }

    /**
     * Unassign a driver from a vehicle
     */
    @Transactional
    public VehicleDTO unassignDriver(UUID vehicleId, UUID organizationId, UserRole assignerRole) {
        // Check RECLAIM_VEHICLE permission
        if (!permissionService.isAllowed(organizationId, "VEHICLE_ASSIGNMENT", "RECLAIM_VEHICLE", assignerRole.name())) {
            throw new ValidationException("You do not have permission to reclaim vehicles");
        }

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Verify vehicle belongs to the organization
        if (!vehicle.getOrganization().getId().equals(organizationId)) {
            throw new ValidationException("Vehicle does not belong to this organization");
        }

        vehicle.setAssignedDriver(null);
        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Unassigned driver from vehicle {} by {}", vehicleId, assignerRole);
        return vehicleMapper.toDTO(saved);
    }

    /**
     * Approve a pending vehicle creation
     */
    @Transactional
    public VehicleDTO approveVehicleCreation(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (vehicle.getStatus() != VehicleStatus.PENDING_CREATION) {
            throw new ValidationException("Vehicle is not pending creation");
        }

        vehicle.setStatus(VehicleStatus.ACTIVE);
        Vehicle saved = vehicleRepository.save(vehicle);

        // Create licence expiry alert if license expiry date is provided
        if (saved.getLicenseExpiry() != null) {
            try {
                expiryAlertService.createAlert(
                    vehicle.getOrganization().getId(),
                    ExpiryItemType.VEHICLE_LICENSE.name(),
                    saved.getId(),
                    saved.getRegistrationNumber(),
                    "Vehicle license disc",
                    saved.getId(),
                    null,
                    saved.getLicenseExpiry()
                );
                log.info("Created licence expiry alert for vehicle {}", saved.getId());
            } catch (Exception e) {
                log.error("Failed to create licence expiry alert for vehicle {}: {}", saved.getId(), e.getMessage());
            }
        }

        log.info("Approved vehicle creation for {}", vehicleId);
        return vehicleMapper.toDTO(saved);
    }

    /**
     * Reject a pending vehicle creation
     */
    @Transactional
    public void rejectVehicleCreation(UUID vehicleId, String rejectionReason, UUID rejectedByUserId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (vehicle.getStatus() != VehicleStatus.PENDING_CREATION) {
            throw new ValidationException("Vehicle is not pending creation");
        }

        vehicle.setIsActive(false);
        vehicle.setRejectionReason(rejectionReason);
        vehicle.setRejectedAt(java.time.OffsetDateTime.now());
        if (rejectedByUserId != null) {
            User rejectedByUser = userRepository.findById(rejectedByUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            vehicle.setRejectedByUser(rejectedByUser);
        }
        vehicleRepository.save(vehicle);
        log.info("Rejected vehicle creation for {} with reason: {}", vehicleId, rejectionReason);
    }

    /**
     * Approve a pending vehicle deletion
     */
    @Transactional
    public void approveVehicleDeletion(UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (vehicle.getStatus() != VehicleStatus.PENDING_DELETION) {
            throw new ValidationException("Vehicle is not pending deletion");
        }

        vehicle.setIsActive(false);
        vehicleRepository.save(vehicle);
        log.info("Approved vehicle deletion for {}", vehicleId);
    }

    /**
     * Reject a pending vehicle deletion
     */
    @Transactional
    public VehicleDTO rejectVehicleDeletion(UUID vehicleId, String rejectionReason, UUID rejectedByUserId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (vehicle.getStatus() != VehicleStatus.PENDING_DELETION) {
            throw new ValidationException("Vehicle is not pending deletion");
        }

        vehicle.setStatus(VehicleStatus.ACTIVE);
        vehicle.setRejectionReason(rejectionReason);
        vehicle.setRejectedAt(java.time.OffsetDateTime.now());
        if (rejectedByUserId != null) {
            User rejectedByUser = userRepository.findById(rejectedByUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            vehicle.setRejectedByUser(rejectedByUser);
        }
        Vehicle saved = vehicleRepository.save(vehicle);
        log.info("Rejected vehicle deletion for {} with reason: {}", vehicleId, rejectionReason);
        return vehicleMapper.toDTO(saved);
    }

    /**
     * Get pending vehicles for admin approval
     */
    @Transactional(readOnly = true)
    public List<VehicleDTO> getPendingVehicles(UUID organizationId) {
        List<Vehicle> pendingVehicles = vehicleRepository.findByOrganizationIdAndStatusIn(
            organizationId,
            java.util.List.of(VehicleStatus.PENDING_CREATION, VehicleStatus.PENDING_DELETION)
        );
        return pendingVehicles.stream()
                .map(vehicleMapper::toDTO)
                .collect(Collectors.toList());
    }

    // ==================== COMPUTED ODOMETER LOGIC ====================

    private void populateComputedOdometer(Vehicle vehicle) {
        if (!useComputedOdometer) return;
        expenseRepository.findMaxOdometerByVehicleId(vehicle.getId())
            .ifPresent(vehicle::setComputedOdometer);
    }

    private void populateComputedOdometers(List<Vehicle> vehicles) {
        if (!useComputedOdometer || vehicles.isEmpty()) return;

        Map<UUID, Integer> maxMap = expenseRepository
            .findMaxOdometersForVehicles(
                vehicles.stream().map(Vehicle::getId).toList()
            )
            .stream()
            .collect(Collectors.toMap(
                r -> (UUID) r[0],
                r -> (Integer) r[1],
                (a, b) -> a
            ));

        vehicles.forEach(v -> v.setComputedOdometer(maxMap.get(v.getId())));
    }

    public List<FleetOdometerStatusDTO> getFleetOdometerStatus(UUID orgId) {
        log.info("Fetching fleet odometer status for organization {}", orgId);
        return vehicleRepository.findFleetOdometerStatus(orgId);
    }

    /**
     * Get fleet assignment history for all vehicles in an organization
     */
    @Transactional(readOnly = true)
    public List<FleetAssignmentHistoryDTO> getFleetAssignmentHistory(UUID orgId, boolean includeConditionReports) {
        log.info("Fetching fleet assignment history for organization {}, includeConditionReports: {}", orgId, includeConditionReports);
        
        // Get all vehicles for the organization
        List<Vehicle> vehicles = vehicleRepository.findByOrganizationId(orgId);
        
        return vehicles.stream().map(vehicle -> {
            // Get current odometer
            Integer currentOdometer = vehicle.getComputedOdometer() != null 
                ? vehicle.getComputedOdometer() 
                : vehicle.getCurrentOdometer();
            
            // Get all assignments for this vehicle
            List<za.co.fleetexpense.entity.VehicleAssignment> assignments = 
                vehicleAssignmentRepository.findAssignmentsByVehicleIdOrderByAssignedAtDesc(vehicle.getId());
            
            // Build assignment info list
            List<FleetAssignmentHistoryDTO.AssignmentInfo> assignmentInfos = assignments.stream()
                .map(assignment -> {
                    FleetAssignmentHistoryDTO.AssignmentInfo.AssignmentInfoBuilder builder = 
                        FleetAssignmentHistoryDTO.AssignmentInfo.builder();
                    
                    // Driver info
                    builder.driverName(assignment.getAssignedDriver().getFirstName() + " " + assignment.getAssignedDriver().getLastName());
                    builder.driverEmail(assignment.getAssignedDriver().getEmail());
                    
                    // Assignment dates
                    builder.assignedAt(assignment.getAssignedAt());
                    builder.unassignedAt(assignment.getUnassignedAt());
                    
                    // Assigner info
                    builder.assignedByName(assignment.getAssignedBy().getFirstName() + " " + assignment.getAssignedBy().getLastName());
                    builder.assignedByEmail(assignment.getAssignedBy().getEmail());
                    
                    // Status
                    builder.status(assignment.getStatus().name());
                    
                    // Odometer at assignment
                    odometerConfirmationRepository.findByAssignmentId(assignment.getId())
                        .ifPresent(oc -> {
                            builder.odometerAtAssignment(oc.getOdometerReading());
                        });
                    
                    // Condition report data (if requested)
                    if (includeConditionReports) {
                        vehicleConditionReportRepository.findByAssignmentId(assignment.getId())
                            .ifPresent(cr -> {
                                // Build detailed condition report DTO
                                FleetAssignmentHistoryDTO.VehicleConditionReportDTO.VehicleConditionReportDTOBuilder crBuilder =
                                    FleetAssignmentHistoryDTO.VehicleConditionReportDTO.builder();

                                crBuilder.purpose(cr.getPurpose().name());
                                crBuilder.createdAt(cr.getCreatedAt());
                                crBuilder.completedByName(cr.getCreatedBy().getFirstName() + " " + cr.getCreatedBy().getLastName());

                                // Map sections with images
                                List<FleetAssignmentHistoryDTO.ConditionSectionDTO> sectionDTOs = cr.getSections().stream()
                                    .map(section -> {
                                        List<String> imageUrls = section.getImages().stream()
                                            .map(VehicleConditionImage::getImageUrl)
                                            .limit(5)
                                            .collect(Collectors.toList());

                                        return FleetAssignmentHistoryDTO.ConditionSectionDTO.builder()
                                            .sectionType(section.getSectionType().name())
                                            .condition(section.getCondition().name())
                                            .description(section.getDescription())
                                            .locked(section.getLocked())
                                            .inspectedAt(section.getInspectedAt())
                                            .imageUrls(imageUrls)
                                            .build();
                                    })
                                    .collect(Collectors.toList());

                                crBuilder.sections(sectionDTOs);

                                // Map manager notes
                                List<FleetAssignmentHistoryDTO.ManagerNoteDTO> noteDTOs = cr.getManagerNotes().stream()
                                    .map(note -> FleetAssignmentHistoryDTO.ManagerNoteDTO.builder()
                                        .note(note.getNote())
                                        .createdByName(note.getCreatedBy().getFirstName() + " " + note.getCreatedBy().getLastName())
                                        .createdAt(note.getCreatedAt())
                                        .build())
                                    .collect(Collectors.toList());

                                crBuilder.managerNotes(noteDTOs);

                                builder.conditionReport(crBuilder.build());
                            });
                    }
                    
                    return builder.build();
                })
                .collect(Collectors.toList());
            
            // Get current driver (first active assignment)
            FleetAssignmentHistoryDTO.AssignmentInfo currentDriver = assignmentInfos.stream()
                .filter(ai -> "ACTIVE".equals(ai.getStatus()))
                .findFirst()
                .orElse(null);
            
            // Get previous driver (second assignment if exists)
            FleetAssignmentHistoryDTO.AssignmentInfo previousDriver = null;
            if (assignmentInfos.size() > 1) {
                previousDriver = assignmentInfos.get(1);
            }
            
            return FleetAssignmentHistoryDTO.builder()
                .vehicleRegistration(vehicle.getRegistrationNumber())
                .vehicleMake(vehicle.getMake())
                .vehicleModel(vehicle.getModel())
                .currentOdometer(currentOdometer)
                .currentDriver(currentDriver)
                .previousDriver(previousDriver)
                .build();
        }).collect(Collectors.toList());
    }
}
