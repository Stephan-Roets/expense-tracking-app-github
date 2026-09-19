package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.VehicleAssignment;
import za.co.fleetexpense.entity.enums.AssignmentStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleAssignmentRepository extends JpaRepository<VehicleAssignment, UUID> {

    List<VehicleAssignment> findByVehicleIdOrderByAssignedAtDesc(UUID vehicleId);

    List<VehicleAssignment> findByAssignedDriverIdOrderByAssignedAtDesc(UUID driverId);

    @Query("SELECT va FROM VehicleAssignment va WHERE va.assignedDriver.id = :driverId AND va.vehicle.organization.id = :orgId ORDER BY va.assignedAt DESC")
    List<VehicleAssignment> findByAssignedDriverIdAndVehicleOrganizationIdOrderByAssignedAtDesc(@Param("driverId") UUID driverId, @Param("orgId") UUID orgId);

    @Query("SELECT va FROM VehicleAssignment va WHERE va.vehicle.organization.id = :orgId ORDER BY va.assignedAt DESC")
    List<VehicleAssignment> findByVehicleOrganizationIdOrderByAssignedAtDesc(@Param("orgId") UUID orgId);

    Optional<VehicleAssignment> findByVehicleIdAndStatus(UUID vehicleId, AssignmentStatus status);

    List<VehicleAssignment> findByStatusOrderByAssignedAtDesc(String status);

    @Query("SELECT va FROM VehicleAssignment va WHERE va.vehicle.id = :vehicleId ORDER BY va.assignedAt DESC")
    List<VehicleAssignment> findAssignmentsByVehicleIdOrderByAssignedAtDesc(@Param("vehicleId") UUID vehicleId);
}
