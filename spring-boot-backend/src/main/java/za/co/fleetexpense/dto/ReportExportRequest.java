package za.co.fleetexpense.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.co.fleetexpense.entity.enums.ExportFormat;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.enums.ReportExportType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportExportRequest {

    @NotNull(message = "Report type is required")
    private ReportExportType reportType;

    @NotNull(message = "Format is required")
    private ExportFormat format;

    private OffsetDateTime dateFrom;

    private OffsetDateTime dateTo;

    // Tax calculation specific fields
    private UUID vehicleId;

    private Integer taxYear;

    private TaxCalculationMethod calculationMethod;
}
