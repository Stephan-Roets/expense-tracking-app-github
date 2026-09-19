package za.co.fleetexpense.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record VehicleConditionReportDTO(
    UUID id,
    UUID assignmentId,
    UUID vehicleId,
    UUID createdById,
    String createdByName,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    List<VehicleConditionSectionDTO> sections,
    List<ManagerNoteDTO> managerNotes
) {}
