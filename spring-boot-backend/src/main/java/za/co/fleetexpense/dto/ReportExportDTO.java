package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.co.fleetexpense.entity.enums.ExportFormat;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.enums.ReportExportStatus;
import za.co.fleetexpense.enums.ReportExportType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportExportDTO {

    private UUID id;
    private UUID organizationId;
    private UUID requestedById;
    private String requestedByName;
    private ReportExportType reportType;
    private ExportFormat format;
    private OffsetDateTime dateFrom;
    private OffsetDateTime dateTo;
    
    // Tax calculation specific fields
    private UUID vehicleId;
    private Integer taxYear;
    private TaxCalculationMethod calculationMethod;
    
    private ReportExportStatus status;
    private String fileUrl;
    private String errorMessage;
    private OffsetDateTime completedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
