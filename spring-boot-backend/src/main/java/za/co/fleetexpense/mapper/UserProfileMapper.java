package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import za.co.fleetexpense.dto.UserProfileDTO;
import za.co.fleetexpense.entity.UserProfile;

@Mapper(componentModel = "spring", uses = AddressMapper.class)
public interface UserProfileMapper {

    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "driversLicenseNumber", target = "driversLicenseNumber")
    @Mapping(source = "driverLicenseFrontUrl", target = "driversLicenseFrontUrl")
    @Mapping(source = "driverLicenseBackUrl", target = "driversLicenseBackUrl")
    @Mapping(source = "driverLicenseExpiry", target = "driversLicenseExpiry")
    @Mapping(target = "address", ignore = true)
    UserProfileDTO toDto(UserProfile profile);
}
