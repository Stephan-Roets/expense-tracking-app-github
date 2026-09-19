package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.dto.FleetOdometerStatusDTO;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.VehicleStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
    List<Vehicle> findByOrganizationId(UUID organizationId);
    List<Vehicle> findByOrganizationIdAndIsActiveTrue(UUID organizationId);
    List<Vehicle> findByOrganizationIdAndAssignedDriverIdAndIsActiveTrue(UUID organizationId, UUID driverId);
    boolean existsByOrganizationIdAndRegistrationNumber(UUID organizationId, String registrationNumber);
    boolean existsByOrganizationIdAndRegistrationNumberAndIsActiveTrue(UUID organizationId, String registrationNumber);
    List<Vehicle> findByOrganizationIdAndStatusIn(UUID organizationId, List<VehicleStatus> statuses);
    List<Vehicle> findByOrganizationIdAndRejectionReasonIsNotNullAndIsActiveFalse(UUID organizationId);

    @Query("""
        SELECT v FROM Vehicle v 
        WHERE v.organization.id = :orgId 
        AND v.id IN (
            SELECT a.vehicle.id FROM VehicleAssignment a 
            WHERE a.vehicle.organization.id = :orgId 
            AND a.assignedAt BETWEEN :dateFrom AND :dateTo
        )
        """)
    List<Vehicle> findActiveInPeriod(
        @Param("orgId") UUID orgId,
        @Param("dateFrom") LocalDate dateFrom,
        @Param("dateTo") LocalDate dateTo
    );

    @Query("SELECT v.id FROM Vehicle v")
    List<UUID> findAllIds();

    @Query(value = """
        SELECT v.id, v.registration_number, v.make, v.model,
               MAX(e.odometer_reading) AS current_odometer,
               MAX(e.expense_date) FILTER (WHERE e.odometer_reading IS NOT NULL) AS last_odometer_date,
               a.id AS assignment_id,
               u.first_name || ' ' || u.last_name AS driver_name,
               a.assigned_at
        FROM vehicles v
        LEFT JOIN expenses e ON e.vehicle_id = v.id AND e.odometer_reading IS NOT NULL
        LEFT JOIN vehicle_assignment a ON a.vehicle_id = v.id AND a.status = 'ACTIVE'
        LEFT JOIN users u ON u.id = a.assigned_driver_id
        WHERE v.organization_id = :orgId AND v.is_active = true
        GROUP BY v.id, v.registration_number, v.make, v.model,
                 a.id, u.first_name, u.last_name, a.assigned_at
        ORDER BY v.registration_number
        """, nativeQuery = true)
    List<FleetOdometerStatusDTO> findFleetOdometerStatus(@Param("orgId") UUID orgId);
}
