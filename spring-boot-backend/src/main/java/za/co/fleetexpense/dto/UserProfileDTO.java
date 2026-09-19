package za.co.fleetexpense.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserProfileDTO(
    UUID id,
    UUID userId,
    String idNumber,
    String homePhone,
    String mobilePhone,
    String driversLicenseNumber,
    String driversLicenseFrontUrl,
    String driversLicenseBackUrl,
    LocalDate driversLicenseExpiry,
    AddressDTO address,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
