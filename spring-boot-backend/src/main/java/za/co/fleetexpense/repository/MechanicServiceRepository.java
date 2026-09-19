package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.MechanicService;
import za.co.fleetexpense.entity.enums.ServiceType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MechanicServiceRepository extends JpaRepository<MechanicService, UUID> {

    Optional<MechanicService> findByExpenseId(UUID expenseId);

    @Query("SELECT ms FROM MechanicService ms JOIN ms.expense e WHERE e.vehicle.id = :vehicleId")
    List<MechanicService> findByVehicle(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT ms FROM MechanicService ms JOIN ms.expense e WHERE e.organization.id = :orgId AND ms.serviceType = :type")
    List<MechanicService> findByOrganizationAndType(@Param("orgId") UUID orgId, @Param("type") ServiceType type);
}
