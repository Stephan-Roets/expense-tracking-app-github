package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import za.co.fleetexpense.dto.VehicleFuelConsumptionStatsDTO;
import za.co.fleetexpense.entity.VehicleFuelConsumptionStats;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface VehicleFuelConsumptionStatsMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.registrationNumber", target = "vehicleRegistration")
    @Mapping(target = "vehicleName", expression = "java(entity.getVehicle() != null ? entity.getVehicle().getMake() + ' ' + entity.getVehicle().getModel() : null)")
    VehicleFuelConsumptionStatsDTO toDTO(VehicleFuelConsumptionStats entity);
}
