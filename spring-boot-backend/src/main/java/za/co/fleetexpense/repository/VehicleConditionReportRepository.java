package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.VehicleConditionReport;
import za.co.fleetexpense.enums.ConditionReportPurpose;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleConditionReportRepository extends JpaRepository<VehicleConditionReport, UUID> {
    Optional<VehicleConditionReport> findByAssignmentId(UUID assignmentId);
    Optional<VehicleConditionReport> findByVehicleId(UUID vehicleId);
    Optional<VehicleConditionReport> findByAssignmentIdAndPurpose(UUID assignmentId, ConditionReportPurpose purpose);
    List<VehicleConditionReport> findAllByAssignmentId(UUID assignmentId);
}
