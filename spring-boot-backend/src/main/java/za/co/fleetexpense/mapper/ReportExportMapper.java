package za.co.fleetexpense.mapper;

import org.springframework.stereotype.Component;
import za.co.fleetexpense.dto.ReportExportDTO;
import za.co.fleetexpense.entity.ReportExport;

@Component
public class ReportExportMapper {

    public ReportExportDTO toDto(ReportExport entity) {
        if (entity == null) {
            return null;
        }

        return ReportExportDTO.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganization() != null ? entity.getOrganization().getId() : null)
                .requestedById(entity.getRequestedBy() != null ? entity.getRequestedBy().getId() : null)
                .requestedByName(entity.getRequestedBy() != null ? 
                    entity.getRequestedBy().getFirstName() + " " + entity.getRequestedBy().getLastName() : null)
                .reportType(entity.getReportType())
                .format(entity.getFormat())
                .dateFrom(entity.getDateFrom())
                .dateTo(entity.getDateTo())
                .vehicleId(entity.getVehicleId())
                .taxYear(entity.getTaxYear())
                .calculationMethod(entity.getCalculationMethod())
                .status(entity.getStatus())
                .fileUrl(entity.getFileUrl())
                .errorMessage(entity.getErrorMessage())
                .completedAt(entity.getCompletedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
