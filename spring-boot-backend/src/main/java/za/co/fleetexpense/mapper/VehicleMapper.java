package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import za.co.fleetexpense.dto.VehicleCreateRequest;
import za.co.fleetexpense.dto.VehicleDTO;
import za.co.fleetexpense.dto.VehicleUpdateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.Vehicle;

@Mapper(componentModel = "spring")
public interface VehicleMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "assignedDriver.id", target = "assignedDriverId")
    @Mapping(source = "assignedDriver.firstName", target = "assignedDriverName", qualifiedByName = "formatDriverName")
    @Mapping(source = "status", target = "status")
    @Mapping(source = "rejectionReason", target = "rejectionReason")
    @Mapping(source = "rejectedAt", target = "rejectedAt")
    @Mapping(source = "rejectedByUser.id", target = "rejectedByUserId")
    @Mapping(source = "rejectedByUser.firstName", target = "rejectedByName", qualifiedByName = "formatRejectedByName")
    @Mapping(target = "currentOdometer", expression = "java(entity.getCurrentOdometer())")
    @Mapping(source = "computedOdometer", target = "computedOdometer")
    VehicleDTO toDTO(Vehicle entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", source = "organizationId", qualifiedByName = "organizationFromId")
    @Mapping(target = "assignedDriver", source = "assignedDriverId", qualifiedByName = "driverFromId")
    @Mapping(target = "isActive", constant = "true")
    @Mapping(target = "isLocked", constant = "false")
    @Mapping(target = "compliant", constant = "false")
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "lockedAt", ignore = true)
    @Mapping(target = "lockedByUser", ignore = true)
    @Mapping(target = "lockedReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "fuelType", source = "fuelType")
    @Mapping(target = "drivetrainType", source = "drivetrainType")
    @Mapping(target = "minorServiceIntervalKm", source = "minorServiceIntervalKm")
    @Mapping(target = "majorServiceIntervalKm", source = "majorServiceIntervalKm")
    @Mapping(target = "brakeOverhaulIntervalKm", source = "brakeOverhaulIntervalKm")
    @Mapping(target = "minorServiceIntervalMonths", source = "minorServiceIntervalMonths")
    @Mapping(target = "majorServiceIntervalMonths", source = "majorServiceIntervalMonths")
    @Mapping(target = "brakeOverhaulIntervalMonths", source = "brakeOverhaulIntervalMonths")
    Vehicle toEntity(VehicleCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "assignedDriver", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "isLocked", ignore = true)
    @Mapping(target = "lockedAt", ignore = true)
    @Mapping(target = "lockedByUser", ignore = true)
    @Mapping(target = "lockedReason", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "currentOdometer", ignore = true)
    @Mapping(target = "minorServiceIntervalKm", source = "minorServiceIntervalKm")
    @Mapping(target = "majorServiceIntervalKm", source = "majorServiceIntervalKm")
    @Mapping(target = "brakeOverhaulIntervalKm", source = "brakeOverhaulIntervalKm")
    @Mapping(target = "minorServiceIntervalMonths", source = "minorServiceIntervalMonths")
    @Mapping(target = "majorServiceIntervalMonths", source = "majorServiceIntervalMonths")
    @Mapping(target = "brakeOverhaulIntervalMonths", source = "brakeOverhaulIntervalMonths")
    void updateEntity(@MappingTarget Vehicle entity, VehicleUpdateRequest request);

    @Named("organizationFromId")
    default Organization organizationFromId(java.util.UUID id) {
        if (id == null) {
            return null;
        }
        Organization org = new Organization();
        org.setId(id);
        return org;
    }

    @Named("driverFromId")
    default za.co.fleetexpense.entity.User driverFromId(java.util.UUID id) {
        if (id == null) {
            return null;
        }
        za.co.fleetexpense.entity.User driver = new za.co.fleetexpense.entity.User();
        driver.setId(id);
        return driver;
    }

    @Named("formatDriverName")
    default String formatDriverName(String firstName) {
        return firstName != null ? firstName : "Unassigned";
    }

    @Named("formatRejectedByName")
    default String formatRejectedByName(String firstName) {
        return firstName != null ? firstName : null;
    }
}
