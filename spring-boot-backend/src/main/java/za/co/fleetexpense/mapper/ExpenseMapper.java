package za.co.fleetexpense.mapper;

import org.hibernate.Hibernate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;
import za.co.fleetexpense.dto.ExpenseCreateRequest;
import za.co.fleetexpense.dto.ExpenseDTO;
import za.co.fleetexpense.dto.ExpenseUpdateRequest;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = VehicleMapper.class)
public interface ExpenseMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "vehicle", target = "vehicle")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(target = "vehicleName", ignore = true)
    @Mapping(source = "user.id", target = "userId")
    @Mapping(source = "user.firstName", target = "userName", qualifiedByName = "formatUserName")
    @Mapping(target = "lockedByUserId", expression = "java(extractLockedByUserIdSafely(entity))")
    @Mapping(target = "fuelLog", ignore = true)
    @Mapping(target = "carWash", ignore = true)
    @Mapping(target = "mechanicService", ignore = true)
    @Mapping(target = "maintenanceTopup", ignore = true)
    @Mapping(target = "tyrePurchase", ignore = true)
    @Mapping(target = "insurancePremium", ignore = true)
    @Mapping(target = "vehicleTracking", ignore = true)
    @Mapping(target = "etollPayment", ignore = true)
    @Mapping(target = "licenseRenewal", ignore = true)
    @Mapping(target = "roadworthyCertificate", ignore = true)
    @Mapping(target = "personalLicense", ignore = true)
    @Mapping(target = "otherFixedExpense", ignore = true)
    ExpenseDTO toDTO(Expense entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "vehicle", source = "vehicleId", qualifiedByName = "vehicleFromId")
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "isTaxDeductible", defaultValue = "true")
    @Mapping(target = "isLocked", constant = "false")
    @Mapping(target = "lockedAt", ignore = true)
    @Mapping(target = "lockedByUser", ignore = true)
    @Mapping(target = "lockedReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "vatAmountZar", ignore = true)
    @Mapping(target = "receiptImageUrl", ignore = true)
    @Mapping(target = "receiptImageKey", ignore = true)
    Expense toEntity(ExpenseCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "vehicle", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "isTaxDeductible", defaultValue = "true")
    @Mapping(target = "isLocked", ignore = true)
    @Mapping(target = "lockedAt", ignore = true)
    @Mapping(target = "lockedByUser", ignore = true)
    @Mapping(target = "lockedReason", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "vatAmountZar", ignore = true)
    @Mapping(target = "receiptImageUrl", ignore = true)
    @Mapping(target = "receiptImageKey", ignore = true)
    void updateEntity(@MappingTarget Expense entity, ExpenseUpdateRequest request);

    @Named("vehicleFromId")
    default Vehicle vehicleFromId(java.util.UUID id) {
        if (id == null) {
            return null;
        }
        Vehicle vehicle = new Vehicle();
        vehicle.setId(id);
        return vehicle;
    }

    @Named("formatUserName")
    default String formatUserName(String firstName) {
        return firstName != null ? firstName : "Unknown";
    }

    default UUID extractLockedByUserIdSafely(Expense expense) {
        User lockedByUser = expense.getLockedByUser();
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
