package za.co.fleetexpense.dto;

public record AddressCreateRequest(
    String recipientFullName,
    String streetNumber,
    String streetName,
    String flatUnitNumber,
    String buildingName,
    String suburb,
    String cityTown,
    String province,
    String postalCode
) {}
