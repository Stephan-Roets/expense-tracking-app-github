package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import za.co.fleetexpense.dto.ExportReportDTO;
import za.co.fleetexpense.entity.ExportReport;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ExportReportMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "requestedBy.id", target = "requestedById")
    @Mapping(target = "requestedByName", expression = "java(entity.getRequestedBy().getFirstName() + \" \" + entity.getRequestedBy().getLastName())")
    ExportReportDTO toDto(ExportReport entity);

    List<ExportReportDTO> toDtoList(List<ExportReport> entities);
}
