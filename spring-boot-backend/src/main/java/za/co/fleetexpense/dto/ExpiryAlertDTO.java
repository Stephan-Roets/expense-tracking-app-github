package za.co.fleetexpense.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for expiry alert information.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryAlertDTO {

    private UUID id;
    private UUID organizationId;
    private String itemType;
    private UUID itemId;
    private UUID relatedId;
    private String itemName;
    private String itemDescription;

    // Vehicle info (for vehicle-related alerts)
    private UUID vehicleId;
    private String vehicleRegistration;
    private String vehicleName;

    // User info (for personal license alerts)
    private UUID userId;
    private String userName;

    private LocalDate expiryDate;
    private Integer daysUntilExpiry;
    private String expiryStatus;

    private Boolean isDismissed;
    private OffsetDateTime dismissedAt;
    private UUID dismissedByUserId;
    private OffsetDateTime lastNotifiedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
