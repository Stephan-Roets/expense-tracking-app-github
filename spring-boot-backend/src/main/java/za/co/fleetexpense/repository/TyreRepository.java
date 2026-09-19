package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.Tyre;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TyreRepository extends JpaRepository<Tyre, UUID> {

    Optional<Tyre> findByExpenseId(UUID expenseId);

    @Query("SELECT t FROM Tyre t JOIN t.expense e WHERE e.vehicle.id = :vehicleId")
    List<Tyre> findByVehicle(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT t FROM Tyre t WHERE t.purchaseOdometer > :odometer")
    List<Tyre> findByPurchaseOdometerGreaterThan(@Param("odometer") Integer odometer);
}
