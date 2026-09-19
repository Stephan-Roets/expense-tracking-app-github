package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.FuelLog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FuelLogRepository extends JpaRepository<FuelLog, UUID> {

    Optional<FuelLog> findByExpenseId(UUID expenseId);

    @Query("SELECT fl FROM FuelLog fl JOIN fl.expense e WHERE e.vehicle.id = :vehicleId ORDER BY e.expenseDate DESC")
    List<FuelLog> findByVehicleOrderByDateDesc(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT fl FROM FuelLog fl JOIN fl.expense e WHERE e.organization.id = :orgId")
    List<FuelLog> findByOrganization(@Param("orgId") UUID organizationId);

    @Query("SELECT fl FROM FuelLog fl JOIN fl.expense e WHERE e.organization.id = :orgId AND e.user.id = :userId")
    List<FuelLog> findByOrganizationAndUserId(@Param("orgId") UUID orgId, @Param("userId") UUID userId);
}
