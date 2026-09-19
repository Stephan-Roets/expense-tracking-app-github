package za.co.fleetexpense.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record VehicleAssignmentDTO(
    UUID id,
    UUID vehicleId,
    String vehicleRegistration,
    UUID assignedDriverId,
    String assignedDriverName,
    UUID assignedById,
    String assignedByName,
    OffsetDateTime assignedAt,
    OffsetDateTime unassignedAt,
    UUID unassignedById,
    String unassignedByName,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
