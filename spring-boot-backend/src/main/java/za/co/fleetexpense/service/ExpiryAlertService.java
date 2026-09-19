package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.ExpiryAlertDTO;
import za.co.fleetexpense.entity.*;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.repository.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpiryAlertService {

    private final ExpiryAlertRepository expiryAlertRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;

    public List<ExpiryAlertDTO> getByOrganization(UUID organizationId) {
        return expiryAlertRepository.findByOrganizationId(organizationId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpiryAlertDTO> getActiveAlerts(UUID organizationId) {
        return expiryAlertRepository.findActiveAlerts(organizationId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpiryAlertDTO> getActiveAlertsByDriver(UUID organizationId, UUID driverId) {
        // Only show alerts for vehicles assigned to the driver
        return expiryAlertRepository.findActiveAlertsByDriver(organizationId, driverId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpiryAlertDTO> getByOrganizationAndDriver(UUID organizationId, UUID driverId) {
        // Only show alerts for vehicles assigned to the driver
        return expiryAlertRepository.findByOrganizationAndDriver(organizationId, driverId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpiryAlertDTO> getByStatus(UUID organizationId, String status) {
        return expiryAlertRepository.findActiveByStatus(organizationId, status).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpiryAlertDTO> getByType(UUID organizationId, String type) {
        return expiryAlertRepository.findByOrganizationAndType(organizationId, type).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ExpiryAlertDTO> getByVehicle(UUID vehicleId) {
        return expiryAlertRepository.findByVehicleId(vehicleId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ExpiryAlert getById(UUID id) {
        return expiryAlertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expiry alert not found: " + id));
    }

    private ExpiryAlertDTO toDTO(ExpiryAlert alert) {
        String vehicleRegistration = null;
        String vehicleName = null;
        String userName = null;

        if (alert.getVehicle() != null) {
            vehicleRegistration = alert.getVehicle().getRegistrationNumber();
            vehicleName = alert.getVehicle().getNickname();
        }

        if (alert.getUser() != null) {
            userName = alert.getUser().getFirstName() + " " + alert.getUser().getLastName();
        }

        log.info("Mapping alert to DTO - id: {}, itemType: {}, itemId: {}, itemName: {}", 
                alert.getId(), alert.getItemType(), alert.getItemId(), alert.getItemName());

        return ExpiryAlertDTO.builder()
                .id(alert.getId())
                .organizationId(alert.getOrganization() != null ? alert.getOrganization().getId() : null)
                .itemType(alert.getItemType())
                .itemId(alert.getItemId())
                .relatedId(alert.getRelatedId())
                .itemName(alert.getItemName())
                .itemDescription(alert.getItemDescription())
                .vehicleId(alert.getVehicle() != null ? alert.getVehicle().getId() : null)
                .vehicleRegistration(vehicleRegistration)
                .vehicleName(vehicleName)
                .userId(alert.getUser() != null ? alert.getUser().getId() : null)
                .userName(userName)
                .expiryDate(alert.getExpiryDate())
                .daysUntilExpiry(alert.getDaysUntilExpiry())
                .expiryStatus(alert.getExpiryStatus())
                .isDismissed(alert.getIsDismissed())
                .dismissedAt(alert.getDismissedAt())
                .dismissedByUserId(alert.getDismissedByUser() != null ? alert.getDismissedByUser().getId() : null)
                .lastNotifiedAt(alert.getLastNotifiedAt())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .build();
    }

    @Transactional
    public ExpiryAlert dismissAlert(UUID id, UUID userId) {
        expiryAlertRepository.dismissAlert(id, OffsetDateTime.now(), userId);

        // Reload the entity after native query to avoid flush conflicts with enum types
        ExpiryAlert alert = getById(id);

        log.info("Dismissed expiry alert {}", id);
        return alert;
    }

    @Transactional
    public ExpiryAlert dismissAlertByItem(String itemType, UUID itemId, UUID userId) {
        List<ExpiryAlert> alerts = expiryAlertRepository.findByItemTypeAndItemId(itemType, itemId);
        if (alerts.isEmpty()) {
            throw new ResourceNotFoundException("Expiry alert not found for item type " + itemType + " and item id " + itemId);
        }

        ExpiryAlert alert = alerts.get(0);
        UUID alertId = alert.getId();
        expiryAlertRepository.dismissAlert(alertId, OffsetDateTime.now(), userId);

        // Reload the entity after native query to avoid flush conflicts with enum types
        alert = getById(alertId);

        log.info("Dismissed expiry alert for item type {} and item id {}", itemType, itemId);
        return alert;
    }

    @Transactional
    public ExpiryAlert undismissAlertByItem(String itemType, UUID itemId, UUID userId) {
        List<ExpiryAlert> alerts = expiryAlertRepository.findByItemTypeAndItemId(itemType, itemId);
        if (alerts.isEmpty()) {
            throw new ResourceNotFoundException("Expiry alert not found for item type " + itemType + " and item id " + itemId);
        }

        ExpiryAlert alert = alerts.get(0);
        UUID alertId = alert.getId();
        expiryAlertRepository.undismissAlert(alertId);

        // Reload the entity after native query to avoid flush conflicts with enum types
        alert = getById(alertId);

        log.info("Undismissed expiry alert for item type {} and item id {}", itemType, itemId);
        return alert;
    }

    @Transactional
    public void refreshAlerts(UUID organizationId) {
        // This would trigger a refresh of all expiry alerts
        // Implementation would check all expirable items and create/update alerts
        log.info("Refreshing expiry alerts for organization {}", organizationId);
    }

    @Transactional
    public ExpiryAlert createAlert(UUID organizationId, String itemType, UUID itemId,
                                    String itemName, String itemDescription, UUID vehicleId,
                                    UUID userId, LocalDate expiryDate) {
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);

        String status;
        if (daysUntil < 0) {
            status = "EXPIRED";
        } else if (daysUntil <= 7) {
            status = "CRITICAL";
        } else if (daysUntil <= 30) {
            status = "WARNING";
        } else if (daysUntil <= 90) {
            status = "UPCOMING";
        } else {
            status = "FUTURE";
        }

        // Dismiss old alerts of the same item type for this vehicle/user (user took corrective action)
        if (vehicleId != null) {
            List<ExpiryAlert> oldVehicleAlerts = expiryAlertRepository.findByVehicleId(vehicleId);
            for (ExpiryAlert oldAlert : oldVehicleAlerts) {
                if (itemType.equals(oldAlert.getItemType()) 
                        && !oldAlert.getIsDismissed()
                        && !itemId.equals(oldAlert.getItemId())) {
                    oldAlert.setIsDismissed(true);
                    oldAlert.setUpdatedAt(now);
                    expiryAlertRepository.save(oldAlert);
                    log.info("Dismissed old {} alert {} for vehicle {} (new item added)", 
                            itemType, oldAlert.getId(), vehicleId);
                }
            }
        } else if (userId != null) {
            List<ExpiryAlert> oldUserAlerts = expiryAlertRepository.findByUserId(userId);
            for (ExpiryAlert oldAlert : oldUserAlerts) {
                if (itemType.equals(oldAlert.getItemType()) 
                        && !oldAlert.getIsDismissed()
                        && !itemId.equals(oldAlert.getItemId())) {
                    oldAlert.setIsDismissed(true);
                    oldAlert.setUpdatedAt(now);
                    expiryAlertRepository.save(oldAlert);
                    log.info("Dismissed old {} alert {} for user {} (new item added)", 
                            itemType, oldAlert.getId(), userId);
                }
            }
        }

        expiryAlertRepository.createAlertNative(id, organizationId, itemType, itemId, null, itemName, itemDescription, vehicleId, userId, expiryDate, (int) daysUntil, status, now, now);

        ExpiryAlert alert = new ExpiryAlert();
        alert.setId(id);
        alert.setOrganization(organizationRepository.findById(organizationId).orElse(null));
        alert.setItemType(itemType);
        alert.setItemId(itemId);
        alert.setItemName(itemName);
        alert.setItemDescription(itemDescription);
        if (vehicleId != null) {
            alert.setVehicle(vehicleRepository.findById(vehicleId).orElse(null));
        }
        if (userId != null) {
            alert.setUser(userRepository.findById(userId).orElse(null));
        }
        alert.setExpiryDate(expiryDate);
        alert.setDaysUntilExpiry((int) daysUntil);
        alert.setExpiryStatus(status);
        alert.setIsDismissed(false);
        alert.setCreatedAt(now);
        alert.setUpdatedAt(now);

        log.info("Created expiry alert for {} {} expiring on {}", itemType, itemId, expiryDate);
        return alert;
    }

    public List<Object> getExpiryAlerts(UUID organizationId) {
        return Collections.emptyList();
    }

    public Map<String, Integer> getExpiryCounts(UUID organizationId) {
        return Collections.emptyMap();
    }
}
