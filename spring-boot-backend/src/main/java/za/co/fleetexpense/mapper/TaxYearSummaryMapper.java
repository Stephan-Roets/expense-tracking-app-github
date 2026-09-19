package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import za.co.fleetexpense.dto.TaxYearSummaryDTO;
import za.co.fleetexpense.entity.TaxYearSummary;

@Mapper(componentModel = "spring")
public interface TaxYearSummaryMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.registrationNumber", target = "vehicleRegistration")
    // Phase 1: These fields are calculated by TaxYearSummaryService and set directly on the DTO
    @Mapping(target = "unclassifiedLoggedKm", ignore = true)
    @Mapping(target = "unloggedKm", ignore = true)
    @Mapping(target = "distanceSource", ignore = true)
    @Mapping(target = "qualifyingCurrentExpenseCents", ignore = true)
    @Mapping(target = "capitalOrAllowanceReviewCents", ignore = true)
    @Mapping(target = "personalOrNonQualifyingExpenseCents", ignore = true)
    @Mapping(target = "uncategorizedExpenseCents", ignore = true)
    @Mapping(target = "dataQualityWarnings", ignore = true)
    @Mapping(target = "isCompanyProvidedVehicle", ignore = true)
    TaxYearSummaryDTO toDTO(TaxYearSummary entity);
}
