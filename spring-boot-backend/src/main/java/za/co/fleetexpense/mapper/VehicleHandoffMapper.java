package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import za.co.fleetexpense.dto.VehicleHandoffDTO;
import za.co.fleetexpense.entity.VehicleHandoff;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VehicleHandoffMapper {

    @Mapping(source = "vehicle.id", target = "vehicleId")
    @Mapping(source = "vehicle.registrationNumber", target = "vehicleRegistration")
    @Mapping(source = "oldAssignment.id", target = "oldAssignmentId")
    @Mapping(source = "oldAssignment.assignedDriver.id", target = "oldDriverId")
    @Mapping(target = "oldDriverName", expression = "java(handoff.getOldAssignment() != null ? handoff.getOldAssignment().getAssignedDriver().getFirstName() + \" \" + handoff.getOldAssignment().getAssignedDriver().getLastName() : null)")
    @Mapping(source = "newAssignment.id", target = "newAssignmentId")
    @Mapping(source = "newAssignment.assignedDriver.id", target = "newDriverId")
    @Mapping(target = "newDriverName", expression = "java(handoff.getNewAssignment().getAssignedDriver().getFirstName() + \" \" + handoff.getNewAssignment().getAssignedDriver().getLastName())")
    @Mapping(source = "initiatedBy.id", target = "initiatedById")
    @Mapping(target = "initiatedByName", expression = "java(handoff.getInitiatedBy().getFirstName() + \" \" + handoff.getInitiatedBy().getLastName())")
    @Mapping(source = "cancelledBy.id", target = "cancelledById")
    @Mapping(target = "cancelledByName", expression = "java(handoff.getCancelledBy() != null ? handoff.getCancelledBy().getFirstName() + \" \" + handoff.getCancelledBy().getLastName() : null)")
    VehicleHandoffDTO toDto(VehicleHandoff handoff);

    List<VehicleHandoffDTO> toDtoList(List<VehicleHandoff> handoffs);
}
