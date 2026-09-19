package za.co.fleetexpense.dto;

import za.co.fleetexpense.enums.HandoffState;

import java.time.Instant;
import java.util.UUID;

public record VehicleHandoffDTO(
    UUID id,
    UUID vehicleId,
    String vehicleRegistration,
    UUID oldAssignmentId,
    UUID oldDriverId,
    String oldDriverName,
    UUID newAssignmentId,
    UUID newDriverId,
    String newDriverName,
    UUID initiatedById,
    String initiatedByName,
    HandoffState state,
    Instant managerApprovedAt,
    Instant completedAt,
    Instant cancelledAt,
    UUID cancelledById,
    String cancelledByName,
    String cancellationReason,
    String overrideReason,
    Instant createdAt
) {}
