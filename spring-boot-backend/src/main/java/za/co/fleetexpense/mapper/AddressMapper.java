package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import za.co.fleetexpense.dto.AddressDTO;
import za.co.fleetexpense.entity.Address;

@Mapper(componentModel = "spring")
public interface AddressMapper {

    @Mapping(source = "userProfile.id", target = "userProfileId")
    AddressDTO toDto(Address address);

    @Mapping(target = "userProfile", ignore = true)
    Address toEntity(AddressDTO dto);
}
