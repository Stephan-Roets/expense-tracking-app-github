package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import za.co.fleetexpense.dto.OrganizationCreateRequest;
import za.co.fleetexpense.dto.OrganizationDTO;
import za.co.fleetexpense.entity.Organization;

@Mapper(componentModel = "spring")
public interface OrganizationMapper {

    OrganizationDTO toDTO(Organization entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Organization toEntity(OrganizationCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget Organization entity, OrganizationCreateRequest request);
}
