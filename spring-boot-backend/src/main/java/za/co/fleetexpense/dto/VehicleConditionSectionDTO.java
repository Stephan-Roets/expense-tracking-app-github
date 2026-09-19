package za.co.fleetexpense.dto;

import za.co.fleetexpense.entity.enums.Condition;
import za.co.fleetexpense.entity.enums.SectionType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record VehicleConditionSectionDTO(
    UUID id,
    UUID reportId,
    SectionType sectionType,
    Condition condition,
    String description,
    Boolean locked,
    OffsetDateTime inspectedAt,
    OffsetDateTime createdAt,
    List<VehicleConditionImageDTO> images
) {}
