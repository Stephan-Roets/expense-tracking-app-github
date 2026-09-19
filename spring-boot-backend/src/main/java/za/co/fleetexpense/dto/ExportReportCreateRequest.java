package za.co.fleetexpense.dto;

import za.co.fleetexpense.enums.ExportReportFormat;
import za.co.fleetexpense.enums.ExportReportType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ExportReportCreateRequest(
    ExportReportType reportType,
    ExportReportFormat reportFormat,
    OffsetDateTime dateFrom,
    OffsetDateTime dateTo,
    List<UUID> vehicleIds
) {}
