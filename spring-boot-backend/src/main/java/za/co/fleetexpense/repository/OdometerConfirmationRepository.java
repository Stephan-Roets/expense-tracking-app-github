package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.OdometerConfirmation;
import za.co.fleetexpense.enums.OdometerConfirmationPurpose;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OdometerConfirmationRepository extends JpaRepository<OdometerConfirmation, UUID> {
    Optional<OdometerConfirmation> findByAssignmentId(UUID assignmentId);
    Optional<OdometerConfirmation> findByAssignmentIdAndPurpose(UUID assignmentId, OdometerConfirmationPurpose purpose);
    List<OdometerConfirmation> findAllByAssignmentId(UUID assignmentId);

    // Phase 1 Fix: Batch query for opening odometer readings by vehicle_id and SARS tax year
    // Returns: vehicle_id, MIN(odometer_reading) as opening
    // Opening readings come from odometer_confirmation with purpose = ONBOARDING
    @Query("""
        SELECT oc.assignment.vehicle.id, MIN(oc.odometerReading)
        FROM OdometerConfirmation oc
        WHERE oc.assignment.vehicle.id IN :vehicleIds
        AND oc.purpose = 'ONBOARDING'
        AND oc.confirmedAt >= :taxYearStart AND oc.confirmedAt < :taxYearEndExcl
        GROUP BY oc.assignment.vehicle.id
        """)
    List<Object[]> findOpeningOdometersByVehiclesAndDateRange(
        @Param("vehicleIds") List<UUID> vehicleIds,
        @Param("taxYearStart") OffsetDateTime taxYearStart,
        @Param("taxYearEndExcl") OffsetDateTime taxYearEndExcl
    );
}
