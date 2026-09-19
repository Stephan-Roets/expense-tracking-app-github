package za.co.fleetexpense.dto;

import java.time.LocalDate;

public record UserProfileCreateRequest(
    String idNumber,
    String homePhone,
    String mobilePhone,
    String driversLicenseNumber,
    String driversLicenseFrontUrl,
    String driversLicenseBackUrl,
    LocalDate driversLicenseExpiry,
    AddressCreateRequest address
) {}
