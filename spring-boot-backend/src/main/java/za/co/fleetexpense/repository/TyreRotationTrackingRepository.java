package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.TyreRotationTracking;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TyreRotationTrackingRepository extends JpaRepository<TyreRotationTracking, UUID> {

    List<TyreRotationTracking> findByOrganizationId(UUID organizationId);

    List<TyreRotationTracking> findByVehicleId(UUID vehicleId);

    Optional<TyreRotationTracking> findByTyreExpenseId(UUID expenseId);

    @Query("SELECT trt FROM TyreRotationTracking trt WHERE trt.vehicle.id = :vehicleId AND trt.isActive = true AND trt.isDismissed = false")
    List<TyreRotationTracking> findActiveByVehicle(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT trt FROM TyreRotationTracking trt WHERE trt.organization.id = :orgId AND trt.isActive = true AND trt.isDismissed = false")
    List<TyreRotationTracking> findAllActive(@Param("orgId") UUID orgId);

    @Query("""
            SELECT DISTINCT trt
            FROM TyreRotationTracking trt
            JOIN FETCH trt.organization org
            JOIN FETCH trt.vehicle vehicle
            JOIN FETCH trt.tyreExpense tyreExpense
            LEFT JOIN FETCH tyreExpense.tyre tyre
            LEFT JOIN FETCH trt.dismissedByUser dismissedByUser
            WHERE trt.organization.id = :orgId
              AND trt.isActive = true
              AND trt.isDismissed = false
            """)
    List<TyreRotationTracking> findAllActiveWithDetails(@Param("orgId") UUID orgId);
}
