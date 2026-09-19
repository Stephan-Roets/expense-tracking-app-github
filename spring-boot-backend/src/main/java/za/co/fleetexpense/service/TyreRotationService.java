package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.TyreRotationWarningDTO;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.Tyre;
import za.co.fleetexpense.entity.TyreRotationHistory;
import za.co.fleetexpense.entity.TyreRotationTracking;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.TyreRotationStatus;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TyreRotationService {

    private final TyreRotationTrackingRepository trackingRepository;
    private final TyreRotationHistoryRepository historyRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    public List<TyreRotationTracking> getAllTracking(UUID organizationId) {
        return trackingRepository.findByOrganizationId(organizationId);
    }

    public List<TyreRotationTracking> getTrackingByVehicle(UUID vehicleId) {
        return trackingRepository.findByVehicleId(vehicleId);
    }

    public List<TyreRotationTracking> getActiveTracking(UUID organizationId) {
        return trackingRepository.findAllActive(organizationId);
    }

    @Transactional(readOnly = true)
    public List<TyreRotationWarningDTO> getActiveWarnings(UUID organizationId) {
        return trackingRepository.findAllActiveWithDetails(organizationId).stream()
                .map(this::toWarningDTO)
                .filter(warning -> warning.getRotationStatus() != TyreRotationStatus.OK)
                .toList();
    }

    public TyreRotationTracking getTrackingById(UUID id) {
        return trackingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tyre rotation tracking not found: " + id));
    }

    @Transactional
    public TyreRotationTracking createTracking(TyreRotationTracking tracking, UUID organizationId) {
        tracking.setOrganization(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found")));
        tracking.setVehicle(vehicleRepository.findById(tracking.getVehicle().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found")));
        tracking.setTyreExpense(expenseRepository.findById(tracking.getTyreExpense().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found")));

        // Calculate next rotation odometer
        if (tracking.getInstallationOdometer() != null && tracking.getRotationIntervalKm() != null) {
            tracking.setNextRotationOdometer(tracking.getInstallationOdometer() + tracking.getRotationIntervalKm());
        }

        TyreRotationTracking saved = trackingRepository.save(tracking);
        log.info("Created tyre rotation tracking {} for vehicle {}", saved.getId(), tracking.getVehicle().getId());
        return saved;
    }

    @Transactional
    public TyreRotationTracking updateTracking(UUID id, TyreRotationTracking updatedTracking) {
        TyreRotationTracking existing = getTrackingById(id);

        existing.setDrivetrainType(updatedTracking.getDrivetrainType());
        existing.setRotationIntervalKm(updatedTracking.getRotationIntervalKm());
        existing.setInstallationOdometer(updatedTracking.getInstallationOdometer());
        existing.setLastRotationOdometer(updatedTracking.getLastRotationOdometer());
        existing.setLastRotationDate(updatedTracking.getLastRotationDate());
        existing.setRotationCount(updatedTracking.getRotationCount());
        existing.setIsActive(updatedTracking.getIsActive());

        // Recalculate next rotation
        if (updatedTracking.getLastRotationOdometer() != null && updatedTracking.getRotationIntervalKm() != null) {
            existing.setNextRotationOdometer(updatedTracking.getLastRotationOdometer() + updatedTracking.getRotationIntervalKm());
        } else if (updatedTracking.getInstallationOdometer() != null && updatedTracking.getRotationIntervalKm() != null) {
            existing.setNextRotationOdometer(updatedTracking.getInstallationOdometer() + updatedTracking.getRotationIntervalKm());
        }

        TyreRotationTracking saved = trackingRepository.save(existing);
        log.info("Updated tyre rotation tracking {}", id);
        return saved;
    }

    @Transactional
    public void deleteTracking(UUID id) {
        TyreRotationTracking tracking = getTrackingById(id);
        trackingRepository.delete(tracking);
        log.info("Deleted tyre rotation tracking {}", id);
    }

    @Transactional
    public TyreRotationTracking dismissTracking(UUID id, UUID userId) {
        TyreRotationTracking tracking = getTrackingById(id);

        tracking.setIsDismissed(true);
        tracking.setDismissedAt(OffsetDateTime.now());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        tracking.setDismissedByUser(user);

        TyreRotationTracking saved = trackingRepository.save(tracking);
        log.info("Dismissed tyre rotation tracking {}", id);
        return saved;
    }

    public List<TyreRotationHistory> getHistoryByTracking(UUID trackingId) {
        return historyRepository.findByTrackingIdOrderByRotationDateDesc(trackingId);
    }

    @Transactional
    public TyreRotationHistory recordRotation(UUID trackingId, Integer rotationOdometer, UUID userId) {
        if (rotationOdometer == null) {
            throw new ValidationException("rotationOdometer is required");
        }

        TyreRotationHistory history = TyreRotationHistory.builder()
                .tracking(TyreRotationTracking.builder().id(trackingId).build())
                .rotationDate(LocalDate.now())
                .rotationOdometer(rotationOdometer)
                .performedBy(resolveUserName(userId))
                .build();

        return recordRotation(history);
    }

    @Transactional
    public TyreRotationHistory recordRotation(TyreRotationHistory history) {
        TyreRotationTracking tracking = trackingRepository.findById(history.getTracking().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tracking not found"));

        history.setTracking(tracking);
        TyreRotationHistory saved = historyRepository.save(history);

        // Use existing interval if set, otherwise use drivetrain-based interval
        int rotationInterval = tracking.getRotationIntervalKm() != null
                ? tracking.getRotationIntervalKm()
                : getRotationIntervalForDrivetrain(tracking.getDrivetrainType());

        tracking.setLastRotationOdometer(history.getRotationOdometer());
        tracking.setLastRotationDate(history.getRotationDate());
        tracking.setRotationCount(tracking.getRotationCount() + 1);
        tracking.setNextRotationOdometer(history.getRotationOdometer() + rotationInterval);
        tracking.setIsDismissed(false);
        tracking.setDismissedAt(null);
        tracking.setDismissedByUser(null);
        trackingRepository.save(tracking);

        log.info("Recorded tyre rotation {} for tracking {}", saved.getId(), tracking.getId());
        return saved;
    }

    private TyreRotationWarningDTO toWarningDTO(TyreRotationTracking tracking) {
        Vehicle vehicle = tracking.getVehicle();
        Tyre tyre = tracking.getTyreExpense() != null ? tracking.getTyreExpense().getTyre() : null;

        // Use existing interval if set, otherwise use drivetrain-based interval
        int rotationInterval = tracking.getRotationIntervalKm() != null
                ? tracking.getRotationIntervalKm()
                : getRotationIntervalForDrivetrain(tracking.getDrivetrainType());

        Integer currentOdometer = vehicle != null && vehicle.getCurrentOdometer() != null
                ? vehicle.getCurrentOdometer()
                : tracking.getInstallationOdometer();
        Integer nextRotationOdometer = tracking.getNextRotationOdometer() != null
                ? tracking.getNextRotationOdometer()
                : tracking.getInstallationOdometer() + rotationInterval;

        int kmRemaining = nextRotationOdometer - currentOdometer;
        int kmOverdue = Math.max(currentOdometer - nextRotationOdometer, 0);

        return TyreRotationWarningDTO.builder()
                .trackingId(tracking.getId())
                .organizationId(tracking.getOrganization() != null ? tracking.getOrganization().getId() : null)
                .vehicleId(vehicle != null ? vehicle.getId() : null)
                .vehicleRegistration(vehicle != null ? vehicle.getRegistrationNumber() : null)
                .vehicleName(formatVehicleName(vehicle))
                .tyreBrand(tyre != null ? tyre.getBrand() : null)
                .tyreModel(tyre != null ? tyre.getModel() : null)
                .tyreSize(tyre != null ? tyre.getSize() : null)
                .installationDate(tracking.getTyreExpense() != null ? tracking.getTyreExpense().getExpenseDate() : null)
                .drivetrainType(tracking.getDrivetrainType())
                .rotationIntervalKm(rotationInterval)
                .installationOdometer(tracking.getInstallationOdometer())
                .lastRotationOdometer(tracking.getLastRotationOdometer())
                .lastRotationDate(tracking.getLastRotationDate())
                .rotationCount(tracking.getRotationCount())
                .nextRotationOdometer(nextRotationOdometer)
                .currentVehicleOdometer(currentOdometer)
                .latestFuelOdometer(currentOdometer)
                .kmOverdue(kmOverdue)
                .rotationStatus(calculateRotationStatus(kmRemaining, rotationInterval))
                .isActive(tracking.getIsActive())
                .isDismissed(tracking.getIsDismissed())
                .dismissedAt(tracking.getDismissedAt())
                .dismissedByName(resolveUserName(tracking.getDismissedByUser()))
                .build();
    }

    private TyreRotationStatus calculateRotationStatus(int kmRemaining, Integer rotationIntervalKm) {
        if (kmRemaining <= 0) {
            return TyreRotationStatus.CRITICAL;
        }

        int warningThreshold = 1000; // Show warning at 1000 km before due

        if (kmRemaining <= warningThreshold) {
            return TyreRotationStatus.WARNING;
        }
        return TyreRotationStatus.OK;
    }

    private int getRotationIntervalForDrivetrain(za.co.fleetexpense.entity.enums.DrivetrainType drivetrainType) {
        if (drivetrainType == null) {
            log.warn("Drivetrain type is null, using default interval of 8000 km");
            return 8000;
        }
        return switch (drivetrainType) {
            case FWD -> 8000;
            case RWD -> 10000;
            case AWD -> 6000;
            case FOUR_BY_FOUR -> 6000;
            default -> {
                log.warn("Unknown drivetrain type: {}, using default interval of 8000 km", drivetrainType);
                yield 8000;
            }
        };
    }

    private String formatVehicleName(Vehicle vehicle) {
        if (vehicle == null) {
            return null;
        }
        if (vehicle.getNickname() != null && !vehicle.getNickname().isBlank()) {
            return vehicle.getNickname();
        }
        return (vehicle.getMake() + " " + vehicle.getModel()).trim();
    }

    private String resolveUserName(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .map(this::resolveUserName)
                .orElse(null);
    }

    private String resolveUserName(User user) {
        if (user == null) {
            return null;
        }

        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";
        String fullName = (firstName + " " + lastName).trim();

        return fullName.isEmpty() ? user.getEmail() : fullName;
    }

    @Transactional
    public TyreRotationTracking ensureTrackingForTyreExpense(UUID tyreExpenseId, za.co.fleetexpense.entity.enums.DrivetrainType overrideDrivetrainType, Boolean overrideIsActive) {
        Expense expense = expenseRepository.findById(tyreExpenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found: " + tyreExpenseId));

        if (expense.getVehicle() == null) {
            log.warn("Cannot create tyre rotation tracking for expense {}: no vehicle associated", tyreExpenseId);
            return null;
        }

        Tyre tyre = expense.getTyre();
        if (tyre == null) {
            log.warn("Cannot create tyre rotation tracking for expense {}: no tyre associated", tyreExpenseId);
            return null;
        }

        TyreRotationTracking existing = trackingRepository.findByTyreExpenseId(tyreExpenseId).orElse(null);

        Integer installationOdometer = tyre.getPurchaseOdometer() != null
                ? tyre.getPurchaseOdometer()
                : expense.getOdometerReading();

        if (installationOdometer == null) {
            log.warn("Cannot create tyre rotation tracking for expense {}: installation odometer is null", tyreExpenseId);
            return null;
        }

        // Use override drivetrain type if provided, otherwise fall back to vehicle's drivetrain type
        za.co.fleetexpense.entity.enums.DrivetrainType drivetrainType = overrideDrivetrainType != null
                ? overrideDrivetrainType
                : (expense.getVehicle().getDrivetrainType() != null
                        ? expense.getVehicle().getDrivetrainType()
                        : za.co.fleetexpense.entity.enums.DrivetrainType.FWD);

        // Determine rotation interval based on drivetrain type
        Integer rotationIntervalKm = tyre.getRotationIntervalKm() != null
                ? tyre.getRotationIntervalKm()
                : getRotationIntervalForDrivetrain(drivetrainType);

        // Use override isActive if provided, otherwise default to true
        boolean isActive = overrideIsActive != null ? overrideIsActive : true;

        if (existing != null) {
            existing.setOrganization(expense.getOrganization());
            existing.setVehicle(expense.getVehicle());
            existing.setTyreExpense(expense);
            existing.setDrivetrainType(drivetrainType);
            existing.setRotationIntervalKm(rotationIntervalKm);
            existing.setInstallationOdometer(installationOdometer);
            existing.setIsActive(isActive);

            if (existing.getLastRotationOdometer() != null) {
                existing.setNextRotationOdometer(existing.getLastRotationOdometer() + rotationIntervalKm);
            } else {
                existing.setNextRotationOdometer(installationOdometer + rotationIntervalKm);
            }

            TyreRotationTracking saved = trackingRepository.save(existing);
            log.info("Updated tyre rotation tracking {} for tyre expense {}, isActive={}", saved.getId(), tyreExpenseId, isActive);
            return saved;
        } else {
            TyreRotationTracking newTracking = TyreRotationTracking.builder()
                    .organization(expense.getOrganization())
                    .vehicle(expense.getVehicle())
                    .tyreExpense(expense)
                    .drivetrainType(drivetrainType)
                    .rotationIntervalKm(rotationIntervalKm)
                    .installationOdometer(installationOdometer)
                    .nextRotationOdometer(installationOdometer + rotationIntervalKm)
                    .rotationCount(0)
                    .isActive(isActive)
                    .isDismissed(false)
                    .build();

            TyreRotationTracking saved = trackingRepository.save(newTracking);
            log.info("Created tyre rotation tracking {} for tyre expense {}, isActive={}", saved.getId(), tyreExpenseId, isActive);
            return saved;
        }
    }

    @Transactional
    public TyreRotationTracking ensureTrackingForTyreExpense(UUID tyreExpenseId, za.co.fleetexpense.entity.enums.DrivetrainType overrideDrivetrainType) {
        return ensureTrackingForTyreExpense(tyreExpenseId, overrideDrivetrainType, null);
    }

    @Transactional
    public TyreRotationTracking ensureTrackingForTyreExpense(UUID tyreExpenseId) {
        return ensureTrackingForTyreExpense(tyreExpenseId, null, null);
    }
}
