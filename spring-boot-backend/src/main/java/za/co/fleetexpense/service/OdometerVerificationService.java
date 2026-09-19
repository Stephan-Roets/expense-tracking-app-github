package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.OdometerReadingType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OdometerVerificationService {

    private final OdometerVerificationRepository odometerVerificationRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public List<OdometerVerification> getByOrganization(UUID organizationId) {
        return odometerVerificationRepository.findByOrganizationId(organizationId);
    }

    public OdometerVerification getById(UUID id) {
        return odometerVerificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Odometer verification not found: " + id));
    }

    public List<OdometerVerification> getByVehicle(UUID vehicleId) {
        return odometerVerificationRepository.findByVehicleId(vehicleId);
    }

    public List<OdometerVerification> getByVehicleAndTaxYear(UUID vehicleId, Integer taxYear) {
        return odometerVerificationRepository.findByVehicleAndTaxYear(vehicleId, taxYear);
    }

    public OdometerVerification getByVehicleYearAndType(UUID vehicleId, Integer taxYear, OdometerReadingType type) {
        return odometerVerificationRepository.findByVehicleYearAndType(vehicleId, taxYear, type)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Odometer verification not found for vehicle " + vehicleId + ", tax year " + taxYear + ", type " + type));
    }

    @Transactional
    public OdometerVerification create(OdometerVerification verification, UUID vehicleId, UUID organizationId, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Check permission based on reading type
        String permissionKey = verification.getReadingType() == OdometerReadingType.OPENING 
                ? "ADD_OPENING_READING" 
                : "ADD_CLOSING_READING";
        
        if (!permissionService.isAllowed(organizationId, "TAX_AUDIT", permissionKey, user.getRole().name())) {
            throw new ValidationException("You do not have permission to add " + 
                    verification.getReadingType() + " readings");
        }
        
        verification.setOrganization(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found")));
        verification.setUser(user);
        var vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        verification.setVehicle(vehicle);

        OdometerVerification saved = odometerVerificationRepository.save(verification);
        log.info("Created odometer verification {} for vehicle {} tax year {}",
                saved.getId(), vehicleId, verification.getTaxYear());
        return saved;
    }

    @Transactional
    public OdometerVerification update(UUID id, OdometerVerification updatedVerification, UUID userId) {
        OdometerVerification existing = getById(id);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Check EDIT_READINGS permission
        if (!permissionService.isAllowed(existing.getOrganization().getId(), "TAX_AUDIT", "EDIT_READINGS", user.getRole().name())) {
            throw new ValidationException("You do not have permission to edit odometer readings");
        }

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked odometer verification");
        }

        // Validate odometer reading is not lower than the vehicle's current display odometer
        // This prevents users from accidentally lowering the odometer reading
        // Note: OPENING readings are historical values at the start of the tax year and can be lower than current odometer
        if (updatedVerification.getOdometerValue() != null && existing.getVehicle() != null) {
            Vehicle vehicle = existing.getVehicle();
            Integer displayOdometer = vehicle.getComputedOdometer() != null ? vehicle.getComputedOdometer() : vehicle.getCurrentOdometer();
            
            // Only validate CLOSING readings - OPENING readings can be any value (historical)
            if (displayOdometer != null && updatedVerification.getOdometerValue() < displayOdometer) {
                if (updatedVerification.getReadingType() == OdometerReadingType.CLOSING) {
                    throw new ValidationException("Cannot save with a lower odometer reading. " +
                        "Current vehicle odometer is " + displayOdometer + " km, " +
                        "but you entered " + updatedVerification.getOdometerValue() + " km. " +
                        "Please go back and enter the correct odometer reading.");
                }
            }
        }

        // Update only the OdometerVerification entity - do NOT update the vehicle's current_odometer or computed_odometer
        // Odometer verifications are historical records for tax purposes and should not affect the vehicle's current odometer
        existing.setReadingType(updatedVerification.getReadingType());
        existing.setOdometerValue(updatedVerification.getOdometerValue());
        existing.setImageUrlAvif(updatedVerification.getImageUrlAvif());
        existing.setImageKey(updatedVerification.getImageKey());
        existing.setCapturedAt(updatedVerification.getCapturedAt());
        existing.setGpsLatitude(updatedVerification.getGpsLatitude());
        existing.setGpsLongitude(updatedVerification.getGpsLongitude());
        existing.setGpsAccuracyMeters(updatedVerification.getGpsAccuracyMeters());
        existing.setDeviceInfo(updatedVerification.getDeviceInfo());
        existing.setIpAddress(updatedVerification.getIpAddress());

        OdometerVerification saved = odometerVerificationRepository.save(existing);
        log.info("Updated odometer verification {}", id);
        return saved;
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        OdometerVerification verification = getById(id);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Check DELETE_READINGS permission
        if (!permissionService.isAllowed(verification.getOrganization().getId(), "TAX_AUDIT", "DELETE_READINGS", user.getRole().name())) {
            throw new ValidationException("You do not have permission to delete odometer readings");
        }

        if (Boolean.TRUE.equals(verification.getIsLocked())) {
            throw new ValidationException("Cannot delete locked odometer verification");
        }

        odometerVerificationRepository.delete(verification);
        log.info("Deleted odometer verification {}", id);
    }

    @Transactional
    public OdometerVerification toggleLock(UUID id, boolean locked, UUID userId, String reason) {
        OdometerVerification verification = getById(id);

        verification.setIsLocked(locked);
        if (locked) {
            verification.setLockedAt(OffsetDateTime.now());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            verification.setLockedByUser(user);
            verification.setLockedReason(reason);
            // Mark vehicle as compliant when an OPENING reading is locked
            if (verification.getVehicle() != null
                    && verification.getReadingType() == OdometerReadingType.OPENING) {
                var vehicle = verification.getVehicle();
                if (!Boolean.TRUE.equals(vehicle.getCompliant())) {
                    vehicle.setCompliant(true);
                    vehicleRepository.save(vehicle);
                    log.info("Vehicle {} marked as compliant after locking opening reading", vehicle.getId());
                }
            }
        } else {
            verification.setLockedAt(null);
            verification.setLockedByUser(null);
            verification.setLockedReason(null);
        }

        OdometerVerification saved = odometerVerificationRepository.save(verification);
        log.info("{} odometer verification {}", locked ? "Locked" : "Unlocked", id);
        return saved;
    }
}
