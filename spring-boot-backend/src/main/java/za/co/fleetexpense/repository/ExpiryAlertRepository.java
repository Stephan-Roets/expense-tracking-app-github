package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.ExpiryAlert;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExpiryAlertRepository extends JpaRepository<ExpiryAlert, UUID> {

    List<ExpiryAlert> findByOrganizationId(UUID organizationId);

    List<ExpiryAlert> findByOrganizationIdAndIsDismissed(UUID organizationId, Boolean isDismissed);

    List<ExpiryAlert> findByIsDismissed(Boolean isDismissed);

    List<ExpiryAlert> findByVehicleId(UUID vehicleId);

    List<ExpiryAlert> findByUserId(UUID userId);

    @Query(value = "SELECT * FROM expiry_alerts WHERE organization_id = :orgId AND expiry_status = :status AND is_dismissed = false", nativeQuery = true)
    List<ExpiryAlert> findActiveByStatus(@Param("orgId") UUID organizationId, @Param("status") String status);

    @Query(value = "SELECT * FROM expiry_alerts WHERE organization_id = :orgId AND item_type = :type", nativeQuery = true)
    List<ExpiryAlert> findByOrganizationAndType(@Param("orgId") UUID organizationId, @Param("type") String type);

    @Query(value = "SELECT * FROM expiry_alerts WHERE organization_id = :orgId AND is_dismissed = false AND expiry_status IN ('EXPIRED', 'CRITICAL', 'WARNING')", nativeQuery = true)
    List<ExpiryAlert> findActiveAlerts(@Param("orgId") UUID organizationId);

    @Query(value = "SELECT ea.* FROM expiry_alerts ea INNER JOIN vehicles v ON ea.vehicle_id = v.id WHERE ea.organization_id = :orgId AND v.assigned_driver_id = :driverId AND ea.is_dismissed = false AND ea.expiry_status IN ('EXPIRED', 'CRITICAL', 'WARNING')", nativeQuery = true)
    List<ExpiryAlert> findActiveAlertsByDriver(@Param("orgId") UUID organizationId, @Param("driverId") UUID driverId);

    @Query(value = "SELECT ea.* FROM expiry_alerts ea INNER JOIN vehicles v ON ea.vehicle_id = v.id WHERE ea.organization_id = :orgId AND v.assigned_driver_id = :driverId", nativeQuery = true)
    List<ExpiryAlert> findByOrganizationAndDriver(@Param("orgId") UUID organizationId, @Param("driverId") UUID driverId);

    @Query(value = "SELECT * FROM expiry_alerts WHERE item_type = :itemType AND item_id = :itemId", nativeQuery = true)
    List<ExpiryAlert> findByItemTypeAndItemId(@Param("itemType") String itemType, @Param("itemId") UUID itemId);

    @Query(value = "UPDATE expiry_alerts SET is_dismissed = true, dismissed_at = :dismissedAt, dismissed_by_user_id = :userId WHERE id = :id", nativeQuery = true)
    @Modifying
    void dismissAlert(@Param("id") UUID id, @Param("dismissedAt") OffsetDateTime dismissedAt, @Param("userId") UUID userId);

    @Query(value = "UPDATE expiry_alerts SET is_dismissed = false, dismissed_at = NULL, dismissed_by_user_id = NULL WHERE id = :id", nativeQuery = true)
    @Modifying
    void undismissAlert(@Param("id") UUID id);

    @Query(value = "INSERT INTO expiry_alerts (id, organization_id, item_type, item_id, related_id, item_name, item_description, vehicle_id, user_id, expiry_date, days_until_expiry, expiry_status, is_dismissed, created_at, updated_at) VALUES (:id, :organizationId, :itemType, :itemId, :relatedId, :itemName, :itemDescription, :vehicleId, :userId, :expiryDate, :daysUntilExpiry, :expiryStatus, false, :createdAt, :updatedAt)", nativeQuery = true)
    @Modifying
    void createAlertNative(@Param("id") UUID id, @Param("organizationId") UUID organizationId, @Param("itemType") String itemType, @Param("itemId") UUID itemId, @Param("relatedId") UUID relatedId, @Param("itemName") String itemName, @Param("itemDescription") String itemDescription, @Param("vehicleId") UUID vehicleId, @Param("userId") UUID userId, @Param("expiryDate") java.time.LocalDate expiryDate, @Param("daysUntilExpiry") Integer daysUntilExpiry, @Param("expiryStatus") String expiryStatus, @Param("createdAt") OffsetDateTime createdAt, @Param("updatedAt") OffsetDateTime updatedAt);

    @Query(value = "UPDATE expiry_alerts SET odometer_reading = :odometerReading, odometer_threshold = :odometerThreshold, distance_until_threshold = :distanceUntilThreshold WHERE id = :id", nativeQuery = true)
    @Modifying
    void updateOdometerFields(@Param("id") UUID id, @Param("odometerReading") Integer odometerReading, @Param("odometerThreshold") Integer odometerThreshold, @Param("distanceUntilThreshold") Integer distanceUntilThreshold);
}
