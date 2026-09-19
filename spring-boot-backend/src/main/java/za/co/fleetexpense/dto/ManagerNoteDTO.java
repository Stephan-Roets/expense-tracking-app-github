package za.co.fleetexpense.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ManagerNoteDTO(
    UUID id,
    UUID reportId,
    String note,
    UUID createdById,
    String createdByName,
    OffsetDateTime createdAt
) {}
