package za.co.fleetexpense.dto;

import za.co.fleetexpense.enums.ExportReportFormat;
import za.co.fleetexpense.enums.ExportReportType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ExportReportDTO(
    UUID id,
    UUID organizationId,
    UUID requestedById,
    String requestedByName,
    ExportReportType reportType,
    ExportReportFormat reportFormat,
    OffsetDateTime dateFrom,
    OffsetDateTime dateTo,
    String fileName,
    Long fileSizeBytes,
    String downloadUrl,
    String status,
    String errorMessage,
    OffsetDateTime createdAt,
    OffsetDateTime completedAt
) {}
