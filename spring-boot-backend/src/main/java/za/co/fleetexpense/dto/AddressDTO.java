package za.co.fleetexpense.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AddressDTO(
    UUID id,
    UUID userProfileId,
    String recipientFullName,
    String streetNumber,
    String streetName,
    String flatUnitNumber,
    String buildingName,
    String suburb,
    String cityTown,
    String province,
    String postalCode,
    String country,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
