package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.VehicleHandoffDTO;
import za.co.fleetexpense.dto.VehicleHandoffInitiateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleAssignment;
import za.co.fleetexpense.entity.VehicleHandoff;
import za.co.fleetexpense.entity.enums.AssignmentStatus;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.enums.ConditionReportPurpose;
import za.co.fleetexpense.enums.HandoffState;
import za.co.fleetexpense.enums.OdometerConfirmationPurpose;
import za.co.fleetexpense.exception.ForbiddenException;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.mapper.VehicleHandoffMapper;
import za.co.fleetexpense.repository.OdometerConfirmationRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.VehicleAssignmentRepository;
import za.co.fleetexpense.repository.VehicleConditionReportRepository;
import za.co.fleetexpense.repository.VehicleHandoffRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class VehicleHandoffService {

    private final VehicleHandoffRepository handoffRepository;
    private final VehicleAssignmentRepository assignmentRepository;
    private final VehicleConditionReportRepository conditionReportRepository;
    private final OdometerConfirmationRepository odometerRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleHandoffMapper handoffMapper;

    public VehicleHandoffDTO initiateHandoff(UUID vehicleId, UUID newDriverId, UUID managerId) {
        User manager = userRepository.findById(managerId)
            .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        
        FleetModeGuard.requireFleetMode(manager.getOrganization());

        if (manager.getRole() != UserRole.MANAGER && manager.getRole() != UserRole.ADMIN && manager.getRole() != UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("Only managers can initiate handoff");
        }

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (!vehicle.getOrganization().getId().equals(manager.getOrganization().getId())) {
            throw new ForbiddenException("Vehicle not in your organization");
        }

        User newDriver = userRepository.findById(newDriverId)
            .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        if (!newDriver.getOrganization().getId().equals(manager.getOrganization().getId())) {
            throw new ForbiddenException("Driver not in your organization");
        }

        Optional<VehicleAssignment> oldAssignmentOpt = assignmentRepository
            .findByVehicleIdAndStatus(vehicleId, AssignmentStatus.ACTIVE);

        VehicleAssignment newAssignment = VehicleAssignment.builder()
            .vehicle(vehicle)
            .assignedDriver(newDriver)
            .assignedBy(manager)
            .status(AssignmentStatus.PENDING)
            .build();
        assignmentRepository.save(newAssignment);

        HandoffState startingState = oldAssignmentOpt.isPresent()
            ? HandoffState.AWAITING_OLD_DRIVER_CONDITION
            : HandoffState.AWAITING_NEW_DRIVER_CONDITION;

        VehicleHandoff handoff = VehicleHandoff.builder()
            .vehicle(vehicle)
            .oldAssignment(oldAssignmentOpt.orElse(null))
            .newAssignment(newAssignment)
            .initiatedBy(manager)
            .state(startingState)
            .build();

        return handoffMapper.toDto(handoffRepository.save(handoff));
    }

    @Transactional
    public VehicleHandoffDTO advanceHandoff(UUID handoffId, UUID userId) {
        User currentUser = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        VehicleHandoff handoff = handoffRepository.findById(handoffId)
            .orElseThrow(() -> new ResourceNotFoundException("Handoff not found"));

        FleetModeGuard.requireFleetMode(handoff.getVehicle().getOrganization());

        if (handoff.getState() == HandoffState.HANDOFF_COMPLETE || handoff.getCancelledAt() != null) {
            throw new ForbiddenException("Handoff is already finalized");
        }

        switch (handoff.getState()) {
            case AWAITING_OLD_DRIVER_CONDITION -> {
                verifyIsOldDriver(handoff, currentUser);
                verifyOldDriverCondition(handoff);
                handoff.setState(HandoffState.AWAITING_OLD_DRIVER_ODOMETER);
            }
            case AWAITING_OLD_DRIVER_ODOMETER -> {
                verifyIsOldDriver(handoff, currentUser);
                verifyOldDriverOdometer(handoff);
                handoff.setState(HandoffState.AWAITING_MANAGER_APPROVAL);
            }
            case AWAITING_MANAGER_APPROVAL -> {
                verifyIsManager(handoff, currentUser);
                handoff.setState(HandoffState.AWAITING_NEW_DRIVER_CONDITION);
                handoff.setManagerApprovedAt(Instant.now());
            }
            case AWAITING_NEW_DRIVER_CONDITION -> {
                verifyIsNewDriver(handoff, currentUser);
                verifyNewDriverCondition(handoff);
                handoff.setState(HandoffState.AWAITING_NEW_DRIVER_ODOMETER);
            }
            case AWAITING_NEW_DRIVER_ODOMETER -> {
                verifyIsNewDriver(handoff, currentUser);
                verifyNewDriverOdometer(handoff);
                completeHandoff(handoff);
            }
            default -> throw new ForbiddenException("Invalid state transition");
        }

        return handoffMapper.toDto(handoffRepository.save(handoff));
    }

    @Transactional
    public void cancelHandoff(UUID handoffId, String reason, UUID managerId) {
        User manager = userRepository.findById(managerId)
            .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        
        VehicleHandoff handoff = handoffRepository.findById(handoffId)
            .orElseThrow(() -> new ResourceNotFoundException("Handoff not found"));

        FleetModeGuard.requireFleetMode(handoff.getVehicle().getOrganization());
        verifyIsManager(handoff, manager);

        if (handoff.getState() == HandoffState.HANDOFF_COMPLETE) {
            throw new ForbiddenException("Cannot cancel a completed handoff");
        }

        if (handoff.getNewAssignment() != null) {
            assignmentRepository.delete(handoff.getNewAssignment());
        }

        handoff.setCancelledAt(Instant.now());
        handoff.setCancelledBy(manager);
        handoff.setCancellationReason(reason);

        handoffRepository.save(handoff);
    }

    @Transactional
    public VehicleHandoffDTO forceCompleteHandoff(UUID handoffId, String reason, UUID managerId) {
        User manager = userRepository.findById(managerId)
            .orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        
        VehicleHandoff handoff = handoffRepository.findById(handoffId)
            .orElseThrow(() -> new ResourceNotFoundException("Handoff not found"));

        FleetModeGuard.requireFleetMode(handoff.getVehicle().getOrganization());
        verifyIsManager(handoff, manager);

        if (handoff.getState() == HandoffState.HANDOFF_COMPLETE || handoff.getCancelledAt() != null) {
            throw new ForbiddenException("Handoff is already finalized");
        }

        if (handoff.getState() != HandoffState.AWAITING_OLD_DRIVER_CONDITION
            && handoff.getState() != HandoffState.AWAITING_OLD_DRIVER_ODOMETER) {
            throw new ForbiddenException("Can only force-complete during old driver handoff phase");
        }

        handoff.setState(HandoffState.AWAITING_MANAGER_APPROVAL);
        handoff.setManagerApprovedAt(Instant.now());
        handoff.setState(HandoffState.AWAITING_NEW_DRIVER_CONDITION);
        handoff.setOverrideReason(reason);

        return handoffMapper.toDto(handoffRepository.save(handoff));
    }

    @Transactional(readOnly = true)
    public VehicleHandoffDTO getActiveHandoffByVehicle(UUID vehicleId, UUID userId) {
        User currentUser = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        FleetModeGuard.requireFleetMode(vehicle.getOrganization());

        if (!vehicle.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ForbiddenException("Vehicle not in your organization");
        }

        VehicleHandoff handoff = handoffRepository
            .findByVehicleIdAndState(vehicleId, HandoffState.AWAITING_OLD_DRIVER_CONDITION)
            .or(() -> handoffRepository.findByVehicleIdAndState(vehicleId, HandoffState.AWAITING_OLD_DRIVER_ODOMETER))
            .or(() -> handoffRepository.findByVehicleIdAndState(vehicleId, HandoffState.AWAITING_MANAGER_APPROVAL))
            .or(() -> handoffRepository.findByVehicleIdAndState(vehicleId, HandoffState.AWAITING_NEW_DRIVER_CONDITION))
            .or(() -> handoffRepository.findByVehicleIdAndState(vehicleId, HandoffState.AWAITING_NEW_DRIVER_ODOMETER))
            .orElseThrow(() -> new ResourceNotFoundException("No active handoff for this vehicle"));

        if (!canAccessHandoff(handoff, currentUser)) {
            throw new ForbiddenException("You do not have access to this handoff");
        }

        return handoffMapper.toDto(handoff);
    }

    @Transactional(readOnly = true)
    public List<VehicleHandoffDTO> getHandoffsByOrganization(UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));
        
        FleetModeGuard.requireFleetMode(organization);

        List<VehicleHandoff> handoffs = handoffRepository.findByVehicleOrganizationId(organizationId);
        return handoffMapper.toDtoList(handoffs);
    }

    private void completeHandoff(VehicleHandoff handoff) {
        if (handoff.getOldAssignment() != null) {
            VehicleAssignment old = handoff.getOldAssignment();
            old.setStatus(AssignmentStatus.ENDED);
            old.setUnassignedAt(OffsetDateTime.now());
            old.setUnassignedBy(handoff.getInitiatedBy());
            assignmentRepository.save(old);
        }

        VehicleAssignment neu = handoff.getNewAssignment();
        neu.setStatus(AssignmentStatus.ACTIVE);
        assignmentRepository.save(neu);

        Vehicle vehicle = handoff.getVehicle();
        vehicle.setAssignedDriver(neu.getAssignedDriver());
        vehicleRepository.save(vehicle);

        handoff.setState(HandoffState.HANDOFF_COMPLETE);
        handoff.setCompletedAt(Instant.now());
    }

    private void verifyIsOldDriver(VehicleHandoff handoff, User user) {
        if (handoff.getOldAssignment() == null) {
            throw new ForbiddenException("No old driver for this handoff");
        }
        if (!handoff.getOldAssignment().getAssignedDriver().getId().equals(user.getId())) {
            throw new ForbiddenException("Only the current driver can perform this action");
        }
    }

    private void verifyIsNewDriver(VehicleHandoff handoff, User user) {
        if (!handoff.getNewAssignment().getAssignedDriver().getId().equals(user.getId())) {
            throw new ForbiddenException("Only the assigned driver can perform this action");
        }
    }

    private void verifyIsManager(VehicleHandoff handoff, User user) {
        if (user.getRole() != UserRole.MANAGER && user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.SUPER_ADMIN) {
            throw new ForbiddenException("Only managers can perform this action");
        }
        if (!handoff.getVehicle().getOrganization().getId().equals(user.getOrganization().getId())) {
            throw new ForbiddenException("Vehicle not in your organization");
        }
    }

    private void verifyOldDriverCondition(VehicleHandoff handoff) {
        conditionReportRepository
            .findByAssignmentIdAndPurpose(handoff.getOldAssignment().getId(), ConditionReportPurpose.HANDOFF)
            .orElseThrow(() -> new ForbiddenException("Old driver must submit handoff condition report"));
    }

    private void verifyOldDriverOdometer(VehicleHandoff handoff) {
        odometerRepository
            .findByAssignmentIdAndPurpose(handoff.getOldAssignment().getId(), OdometerConfirmationPurpose.HANDOFF)
            .orElseThrow(() -> new ForbiddenException("Old driver must submit handoff odometer reading"));
    }

    private void verifyNewDriverCondition(VehicleHandoff handoff) {
        conditionReportRepository
            .findByAssignmentIdAndPurpose(handoff.getNewAssignment().getId(), ConditionReportPurpose.ONBOARDING)
            .orElseThrow(() -> new ForbiddenException("New driver must submit onboarding condition report"));
    }

    private void verifyNewDriverOdometer(VehicleHandoff handoff) {
        odometerRepository
            .findByAssignmentIdAndPurpose(handoff.getNewAssignment().getId(), OdometerConfirmationPurpose.ONBOARDING)
            .orElseThrow(() -> new ForbiddenException("New driver must submit onboarding odometer reading"));
    }

    private boolean canAccessHandoff(VehicleHandoff handoff, User user) {
        if (user.getRole() == UserRole.SUPER_ADMIN || user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER) {
            return handoff.getVehicle().getOrganization().getId().equals(user.getOrganization().getId());
        }
        boolean isOldDriver = handoff.getOldAssignment() != null 
            && handoff.getOldAssignment().getAssignedDriver().getId().equals(user.getId());
        boolean isNewDriver = handoff.getNewAssignment().getAssignedDriver().getId().equals(user.getId());
        return isOldDriver || isNewDriver;
    }
}
