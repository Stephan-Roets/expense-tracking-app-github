package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import za.co.fleetexpense.dto.VehicleAssignmentDTO;
import za.co.fleetexpense.entity.VehicleAssignment;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VehicleAssignmentMapper {

    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.registrationNumber", target = "vehicleRegistration")
    @Mapping(source = "assignedDriver.id", target = "assignedDriverId")
    @Mapping(source = "assignedBy.id", target = "assignedById")
    @Mapping(source = "unassignedBy.id", target = "unassignedById")
    @Mapping(target = "assignedDriverName", ignore = true)
    @Mapping(target = "assignedByName", ignore = true)
    @Mapping(target = "unassignedByName", ignore = true)
    VehicleAssignmentDTO toDto(VehicleAssignment assignment);

    List<VehicleAssignmentDTO> toDtoList(List<VehicleAssignment> assignments);
}
