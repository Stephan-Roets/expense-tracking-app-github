package za.co.fleetexpense.dto;

public record SimpleAddressRequest(
    String addressLine1,
    String addressLine2,
    String suburb,
    String city,
    String province,
    String postalCode,
    String country
) {}
