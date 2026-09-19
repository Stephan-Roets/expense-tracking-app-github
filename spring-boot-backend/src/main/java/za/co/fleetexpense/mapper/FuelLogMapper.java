package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import za.co.fleetexpense.dto.FuelLogCreateRequest;
import za.co.fleetexpense.dto.FuelLogDTO;
import za.co.fleetexpense.dto.FuelLogUpdateRequest;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.FuelLog;
import za.co.fleetexpense.entity.Vehicle;

import java.math.BigDecimal;
import java.util.UUID;

@Mapper(componentModel = "spring")
public interface FuelLogMapper {

    @Mapping(source = "expense.id", target = "expenseId")
    @Mapping(source = "expense.vehicle.id", target = "vehicleId")
    @Mapping(target = "vehicleRegistration", ignore = true)
    @Mapping(source = "previousOdometer", target = "previousOdometer")
    @Mapping(target = "currentOdometer", expression = "java(calculateCurrentOdometer(entity))")
    @Mapping(target = "totalCost", expression = "java(calculateTotalCost(entity))")
    FuelLogDTO toDTO(FuelLog entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "expense", source = "expenseId", qualifiedByName = "expenseFromId")
    @Mapping(target = "previousOdometer", ignore = true)
    @Mapping(target = "kmSinceLastFill", ignore = true)
    @Mapping(target = "efficiencyKmPerLiter", ignore = true)
    @Mapping(target = "consumptionLPer100km", ignore = true)
    @Mapping(target = "consumptionCalculatedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    FuelLog toEntity(FuelLogCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "expense", ignore = true)
    @Mapping(target = "fullTank", ignore = true)
    @Mapping(target = "previousOdometer", ignore = true)
    @Mapping(target = "kmSinceLastFill", ignore = true)
    @Mapping(target = "efficiencyKmPerLiter", ignore = true)
    @Mapping(target = "consumptionLPer100km", ignore = true)
    @Mapping(target = "consumptionCalculatedAt", ignore = true)
    @Mapping(target = "isBaselineFill", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "gpsLatitude", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @Mapping(target = "gpsLongitude", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    @Mapping(target = "gpsAccuracyMeters", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.SET_TO_NULL)
    void updateEntity(@MappingTarget FuelLog entity, FuelLogUpdateRequest request);

    @Named("expenseFromId")
    default Expense expenseFromId(UUID id) {
        if (id == null) {
            return null;
        }
        Expense expense = new Expense();
        expense.setId(id);
        return expense;
    }

    default BigDecimal calculateTotalCost(FuelLog fuelLog) {
        if (fuelLog.getLiters() == null || fuelLog.getPricePerLiter() == null) {
            return null;
        }
        return fuelLog.getLiters().multiply(fuelLog.getPricePerLiter());
    }

    default Integer calculateCurrentOdometer(FuelLog fuelLog) {
        if (fuelLog.getPreviousOdometer() == null || fuelLog.getKmSinceLastFill() == null) {
            return null;
        }
        return fuelLog.getPreviousOdometer() + fuelLog.getKmSinceLastFill();
    }
}
