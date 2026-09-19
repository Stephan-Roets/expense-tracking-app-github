package za.co.fleetexpense.dto;

public record OdometerConfirmationCreateRequest(
    Integer odometerReading,
    String confirmationImageUrl
) {}
