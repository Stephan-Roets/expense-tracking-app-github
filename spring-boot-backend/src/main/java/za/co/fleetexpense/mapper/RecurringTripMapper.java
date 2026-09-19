package za.co.fleetexpense.mapper;

import org.hibernate.Hibernate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;
import za.co.fleetexpense.dto.RecurringTripCreateRequest;
import za.co.fleetexpense.dto.RecurringTripDTO;
import za.co.fleetexpense.entity.RecurringTrip;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RecurringTripMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(target = "vehicleName", expression = "java(entity.getVehicle() != null ? entity.getVehicle().getMake() + ' ' + entity.getVehicle().getModel() : null)")
    @Mapping(source = "user.id", target = "userId")
    @Mapping(target = "userName", expression = "java(entity.getUser() != null ? entity.getUser().getFirstName() + ' ' + entity.getUser().getLastName() : null)")
    @Mapping(source = "purpose", target = "purpose")
    RecurringTripDTO toDTO(RecurringTrip entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "vehicle", source = "vehicleId", qualifiedByName = "vehicleFromId")
    @Mapping(target = "user", source = "userId", qualifiedByName = "userFromId")
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    RecurringTrip toEntity(RecurringTripCreateRequest request);

    @Named("vehicleFromId")
    default Vehicle vehicleFromId(UUID id) {
        if (id == null) {
            return null;
        }
        Vehicle vehicle = new Vehicle();
        vehicle.setId(id);
        return vehicle;
    }

    @Named("userFromId")
    default User userFromId(UUID id) {
        if (id == null) {
            return null;
        }
        User user = new User();
        user.setId(id);
        return user;
    }

    default String formatUserName(String firstName, String lastName) {
        if (firstName == null && lastName == null) {
            return null;
        }
        if (firstName == null) {
            return lastName;
        }
        if (lastName == null) {
            return firstName;
        }
        return firstName + " " + lastName;
    }
}
