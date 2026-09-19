package za.co.fleetexpense.mapper;

import org.hibernate.Hibernate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;
import za.co.fleetexpense.dto.TripCreateRequest;
import za.co.fleetexpense.dto.TripDTO;
import za.co.fleetexpense.dto.TripUpdateRequest;
import za.co.fleetexpense.entity.Trip;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.math.BigDecimal;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TripMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.registrationNumber", target = "vehicleRegistration")
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.firstName", target = "driverName", qualifiedByName = "formatDriverName")
    @Mapping(target = "lockedByUserId", expression = "java(extractLockedByUserIdSafely(entity))")
    @Mapping(target = "distanceKm", expression = "java(calculateDistance(entity))")
    @Mapping(target = "totalTripCosts", expression = "java(calculateTotalCosts(entity))")
    @Mapping(target = "isBusinessTrip", expression = "java(isBusinessTrip(entity))")
    @Mapping(target = "businessKm", expression = "java(calculateBusinessKm(entity))")
    @Mapping(target = "privateKm", expression = "java(calculatePrivateKm(entity))")
    TripDTO toDTO(Trip entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "vehicle", source = "vehicleId", qualifiedByName = "vehicleFromId")
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "distanceKm", ignore = true)
    @Mapping(target = "isLocked", constant = "false")
    @Mapping(target = "lockedAt", ignore = true)
    @Mapping(target = "lockedByUser", ignore = true)
    @Mapping(target = "lockedReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Trip toEntity(TripCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "vehicle", source = "vehicleId", qualifiedByName = "vehicleFromId")
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "distanceKm", ignore = true)
    @Mapping(target = "isLocked", ignore = true)
    @Mapping(target = "lockedAt", ignore = true)
    @Mapping(target = "lockedByUser", ignore = true)
    @Mapping(target = "lockedReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget Trip entity, TripUpdateRequest request);

    @Named("vehicleFromId")
    default Vehicle vehicleFromId(UUID id) {
        if (id == null) {
            return null;
        }
        Vehicle vehicle = new Vehicle();
        vehicle.setId(id);
        return vehicle;
    }

    @Named("formatDriverName")
    default String formatDriverName(String firstName) {
        return firstName != null ? firstName : "Unknown";
    }

    default Integer calculateDistance(Trip trip) {
        if (trip.getStartOdometer() == null || trip.getEndOdometer() == null) {
            return null;
        }
        return trip.getEndOdometer() - trip.getStartOdometer();
    }

    default BigDecimal calculateTotalCosts(Trip trip) {
        BigDecimal tolls = trip.getTollCostsZar() != null ? trip.getTollCostsZar() : BigDecimal.ZERO;
        BigDecimal parking = trip.getParkingCostsZar() != null ? trip.getParkingCostsZar() : BigDecimal.ZERO;
        return tolls.add(parking);
    }

    default Boolean isBusinessTrip(Trip trip) {
        return trip.getPurpose() == TripPurpose.BUSINESS;
    }

    default Integer calculateBusinessKm(Trip trip) {
        if (trip.getPurpose() != TripPurpose.BUSINESS) {
            return 0;
        }
        Integer distance = calculateDistance(trip);
        return distance != null ? distance : 0;
    }

    default Integer calculatePrivateKm(Trip trip) {
        if (trip.getPurpose() != TripPurpose.PRIVATE) {
            return 0;
        }
        Integer distance = calculateDistance(trip);
        return distance != null ? distance : 0;
    }

    default UUID extractLockedByUserIdSafely(Trip trip) {
        User lockedByUser = trip.getLockedByUser();
        if (lockedByUser == null) {
            return null;
        }
        // Avoid lazy loading: only access ID if proxy is already initialized
        if (Hibernate.isInitialized(lockedByUser)) {
            return lockedByUser.getId();
        }
        return null;
    }
}
