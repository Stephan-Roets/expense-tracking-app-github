package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.OdometerConfirmationCreateRequest;
import za.co.fleetexpense.dto.OdometerConfirmationDTO;
import za.co.fleetexpense.entity.OdometerConfirmation;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleAssignment;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.OdometerConfirmationRepository;
import za.co.fleetexpense.repository.VehicleAssignmentRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OdometerConfirmationService {

    private final OdometerConfirmationRepository confirmationRepository;
    private final VehicleAssignmentRepository assignmentRepository;
    private final VehicleRepository vehicleRepository;
    private final StorageService storageService;

    @Transactional
    public OdometerConfirmationDTO createConfirmation(UUID assignmentId, OdometerConfirmationCreateRequest request, User currentUser) {
        VehicleAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle assignment not found"));

        FleetModeGuard.requireFleetMode(assignment.getVehicle().getOrganization());

        if (!assignment.getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Assignment does not belong to your organization");
        }

        if (confirmationRepository.findByAssignmentId(assignmentId).isPresent()) {
            throw new ValidationException("Odometer confirmation already exists for this assignment");
        }

        OdometerConfirmation confirmation = OdometerConfirmation.builder()
                .assignment(assignment)
                .odometerReading(request.odometerReading())
                .confirmationImageUrl(request.confirmationImageUrl())
                .confirmedAt(OffsetDateTime.now())
                .confirmedBy(currentUser)
                .build();

        OdometerConfirmation saved = confirmationRepository.save(confirmation);
        return enrichDTO(saved);
    }

    @Transactional(readOnly = true)
    public OdometerConfirmationDTO getConfirmation(UUID assignmentId, User currentUser) {
        OdometerConfirmation confirmation = confirmationRepository.findByAssignmentId(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Odometer confirmation not found"));

        FleetModeGuard.requireFleetMode(confirmation.getAssignment().getVehicle().getOrganization());

        if (!confirmation.getAssignment().getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Confirmation does not belong to your organization");
        }

        return enrichDTO(confirmation);
    }

    @Transactional(readOnly = true)
    public OdometerConfirmationDTO getConfirmationOrNull(UUID assignmentId, User currentUser) {
        return confirmationRepository.findByAssignmentId(assignmentId)
                .map(confirmation -> {
                    FleetModeGuard.requireFleetMode(confirmation.getAssignment().getVehicle().getOrganization());

                    if (!confirmation.getAssignment().getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
                        throw new ValidationException("Confirmation does not belong to your organization");
                    }

                    return enrichDTO(confirmation);
                })
                .orElse(null);
    }

    @Transactional
    public OdometerConfirmationDTO uploadImage(UUID confirmationId, MultipartFile file, User currentUser) {
        OdometerConfirmation confirmation = confirmationRepository.findById(confirmationId)
                .orElseThrow(() -> new ResourceNotFoundException("Odometer confirmation not found"));

        FleetModeGuard.requireFleetMode(confirmation.getAssignment().getVehicle().getOrganization());

        if (!confirmation.getAssignment().getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Confirmation does not belong to your organization");
        }

        StorageService.UploadResult uploadResult = storageService.uploadFile(file, "odometer-confirmations", currentUser.getId());
        confirmation.setConfirmationImageUrl(uploadResult.getUrl());
        OdometerConfirmation saved = confirmationRepository.save(confirmation);
        return enrichDTO(saved);
    }

    @Transactional
    public OdometerConfirmationDTO updateConfirmation(UUID confirmationId, OdometerConfirmationCreateRequest request, User currentUser) {
        OdometerConfirmation confirmation = confirmationRepository.findById(confirmationId)
                .orElseThrow(() -> new ResourceNotFoundException("Odometer confirmation not found"));

        FleetModeGuard.requireFleetMode(confirmation.getAssignment().getVehicle().getOrganization());

        if (!confirmation.getAssignment().getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Confirmation does not belong to your organization");
        }

        confirmation.setOdometerReading(request.odometerReading());
        OdometerConfirmation saved = confirmationRepository.save(confirmation);
        
        // Update the vehicle's current odometer
        Vehicle vehicle = confirmation.getAssignment().getVehicle();
        vehicle.setCurrentOdometer(request.odometerReading());
        vehicleRepository.save(vehicle);
        
        return enrichDTO(saved);
    }

    private OdometerConfirmationDTO enrichDTO(OdometerConfirmation confirmation) {
        String confirmedByName = confirmation.getConfirmedBy() != null
                ? confirmation.getConfirmedBy().getFirstName() + " " + confirmation.getConfirmedBy().getLastName()
                : null;

        return new OdometerConfirmationDTO(
                confirmation.getId(),
                confirmation.getAssignment().getId(),
                confirmation.getOdometerReading(),
                confirmation.getConfirmationImageUrl(),
                confirmation.getConfirmedAt(),
                confirmation.getConfirmedBy().getId(),
                confirmedByName,
                confirmation.getCreatedAt()
        );
    }
}
