package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import za.co.fleetexpense.dto.UserCreateRequest;
import za.co.fleetexpense.dto.UserDTO;
import za.co.fleetexpense.dto.UserUpdateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "organization.name", target = "organizationName")
    @Mapping(source = "role", target = "role")
    UserDTO toDTO(User entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", source = "organizationId", qualifiedByName = "organizationFromId")
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "emailVerified", constant = "false")
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toEntity(UserCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "emailVerified", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget User entity, UserUpdateRequest request);

    @Named("organizationFromId")
    default Organization organizationFromId(java.util.UUID id) {
        if (id == null) {
            return null;
        }
        Organization org = new Organization();
        org.setId(id);
        return org;
    }
}
