package za.co.fleetexpense.dto;

import java.util.UUID;

public record VehicleAssignmentCreateRequest(
    UUID vehicleId,
    UUID assignedDriverId
) {}
