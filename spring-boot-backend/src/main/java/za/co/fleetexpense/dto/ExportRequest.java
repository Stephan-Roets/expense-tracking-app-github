package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import za.co.fleetexpense.entity.enums.ExportFormat;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExportRequest {

    @NotNull(message = "Export format is required")
    private ExportFormat format;

    // Vehicle ID is optional - if null, exports all vehicles for the organization
    private UUID vehicleId;

    @NotNull(message = "Tax year is required")
    private Integer taxYear;

    // Optional date range filtering
    private LocalDate startDate;
    private LocalDate endDate;

    // Export options
    private Boolean includeTrips = true;
    private Boolean includeExpenses = true;
    private Boolean includeFuelLogs = true;
    private Boolean includeSummary = true;

    // SARS-specific options
    private Boolean sarsCompliantOnly = false;
    private Boolean lockOnExport = false;

    // Email export
    private String email;
}
