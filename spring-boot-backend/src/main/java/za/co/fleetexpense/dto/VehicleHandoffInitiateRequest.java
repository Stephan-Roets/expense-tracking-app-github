package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record VehicleHandoffInitiateRequest(
    @NotNull UUID vehicleId,
    @NotNull UUID newDriverId
) {}
