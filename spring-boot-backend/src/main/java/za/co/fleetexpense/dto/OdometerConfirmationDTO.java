package za.co.fleetexpense.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OdometerConfirmationDTO(
    UUID id,
    UUID assignmentId,
    Integer odometerReading,
    String confirmationImageUrl,
    OffsetDateTime confirmedAt,
    UUID confirmedById,
    String confirmedByName,
    OffsetDateTime createdAt
) {}
