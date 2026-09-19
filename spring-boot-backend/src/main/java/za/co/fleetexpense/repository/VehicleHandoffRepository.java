package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.VehicleHandoff;
import za.co.fleetexpense.enums.HandoffState;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleHandoffRepository extends JpaRepository<VehicleHandoff, UUID> {

    Optional<VehicleHandoff> findByVehicleIdAndState(UUID vehicleId, HandoffState state);

    List<VehicleHandoff> findByVehicleOrganizationId(UUID organizationId);

    List<VehicleHandoff> findByVehicleOrganizationIdAndState(UUID organizationId, HandoffState state);

    Optional<VehicleHandoff> findByOldAssignmentId(UUID oldAssignmentId);

    Optional<VehicleHandoff> findByNewAssignmentId(UUID newAssignmentId);
}
