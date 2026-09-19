package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.VehicleAssignmentCreateRequest;
import za.co.fleetexpense.dto.VehicleAssignmentDTO;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleAssignment;
import za.co.fleetexpense.entity.enums.AssignmentStatus;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.VehicleAssignmentMapper;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleAssignmentRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VehicleAssignmentService {

    private final VehicleAssignmentRepository assignmentRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final VehicleAssignmentMapper assignmentMapper;
    private final PermissionService permissionService;

    @Transactional
    public VehicleAssignmentDTO createAssignment(VehicleAssignmentCreateRequest request, User currentUser) {
        // Check ASSIGN_TO_DRIVER permission
        if (!permissionService.isAllowed(currentUser.getOrganization().getId(), "VEHICLE_ASSIGNMENT", "ASSIGN_TO_DRIVER", currentUser.getRole().name())) {
            throw new ValidationException("You do not have permission to assign vehicles to drivers");
        }
        
        Vehicle vehicle = vehicleRepository.findById(request.vehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        User driver = userRepository.findById(request.assignedDriverId())
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        FleetModeGuard.requireFleetMode(vehicle.getOrganization());

        if (!vehicle.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Vehicle does not belong to your organization");
        }
        if (!driver.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Driver does not belong to your organization");
        }

        VehicleAssignment assignment = VehicleAssignment.builder()
                .vehicle(vehicle)
                .assignedDriver(driver)
                .assignedBy(currentUser)
                .assignedAt(OffsetDateTime.now())
                .status(AssignmentStatus.ACTIVE)
                .build();

        VehicleAssignment saved = assignmentRepository.save(assignment);
        return enrichNames(assignmentMapper.toDto(saved), saved);
    }

    @Transactional(readOnly = true)
    public List<VehicleAssignmentDTO> getAssignmentsByOrganization(User currentUser) {
        FleetModeGuard.requireFleetMode(currentUser.getOrganization());
        List<VehicleAssignment> assignments;
        UserRole role = currentUser.getRole();
        UUID orgId = currentUser.getOrganization().getId();

        if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            assignments = assignmentRepository.findByAssignedDriverIdAndVehicleOrganizationIdOrderByAssignedAtDesc(
                    currentUser.getId(), orgId);
        } else {
            assignments = assignmentRepository.findByVehicleOrganizationIdOrderByAssignedAtDesc(orgId);
        }

        return assignments.stream()
                .map(a -> enrichNames(assignmentMapper.toDto(a), a))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleAssignmentDTO> getAssignmentsByVehicle(UUID vehicleId, User currentUser) {
        if (currentUser == null) {
            throw new ValidationException("User not authenticated");
        }
        
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        FleetModeGuard.requireFleetMode(vehicle.getOrganization());

        if (!vehicle.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Vehicle does not belong to your organization");
        }

        List<VehicleAssignment> assignments = assignmentRepository.findByVehicleIdOrderByAssignedAtDesc(vehicleId);
        return assignments.stream()
                .map(a -> enrichNames(assignmentMapper.toDto(a), a))
                .toList();
    }

    @Transactional
    public VehicleAssignmentDTO unassignVehicle(UUID assignmentId, User currentUser) {
        // Check RECLAIM_VEHICLE permission
        if (!permissionService.isAllowed(currentUser.getOrganization().getId(), "VEHICLE_ASSIGNMENT", "RECLAIM_VEHICLE", currentUser.getRole().name())) {
            throw new ValidationException("You do not have permission to reclaim vehicles");
        }
        
        VehicleAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));

        FleetModeGuard.requireFleetMode(assignment.getVehicle().getOrganization());

        if (!assignment.getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Assignment does not belong to your organization");
        }

        assignment.setUnassignedAt(OffsetDateTime.now());
        assignment.setUnassignedBy(currentUser);
        assignment.setStatus(AssignmentStatus.ENDED);

        VehicleAssignment saved = assignmentRepository.save(assignment);
        return enrichNames(assignmentMapper.toDto(saved), saved);
    }

    private VehicleAssignmentDTO enrichNames(VehicleAssignmentDTO dto, VehicleAssignment entity) {
        String driverName = entity.getAssignedDriver() != null
                ? entity.getAssignedDriver().getFirstName() + " " + entity.getAssignedDriver().getLastName()
                : null;
        String assignedByName = entity.getAssignedBy() != null
                ? entity.getAssignedBy().getFirstName() + " " + entity.getAssignedBy().getLastName()
                : null;
        String unassignedByName = entity.getUnassignedBy() != null
                ? entity.getUnassignedBy().getFirstName() + " " + entity.getUnassignedBy().getLastName()
                : null;

        return new VehicleAssignmentDTO(
                dto.id(), dto.vehicleId(), dto.vehicleRegistration(),
                dto.assignedDriverId(), driverName,
                dto.assignedById(), assignedByName,
                dto.assignedAt(), dto.unassignedAt(),
                dto.unassignedById(), unassignedByName,
                dto.status(), dto.createdAt(), dto.updatedAt()
        );
    }
}
