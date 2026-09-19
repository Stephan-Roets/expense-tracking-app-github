package za.co.fleetexpense.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record VehicleConditionImageDTO(
    UUID id,
    UUID sectionId,
    String imageUrl,
    OffsetDateTime uploadedAt
) {}
