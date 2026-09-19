package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.MaintenanceTopup;
import za.co.fleetexpense.entity.enums.MaintenanceItemType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaintenanceTopupRepository extends JpaRepository<MaintenanceTopup, UUID> {

    Optional<MaintenanceTopup> findByExpenseId(UUID expenseId);

    @Query("SELECT mt FROM MaintenanceTopup mt JOIN mt.expense e WHERE e.vehicle.id = :vehicleId")
    List<MaintenanceTopup> findByVehicle(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT mt FROM MaintenanceTopup mt WHERE mt.itemType = :type")
    List<MaintenanceTopup> findByItemType(@Param("type") MaintenanceItemType type);
}
