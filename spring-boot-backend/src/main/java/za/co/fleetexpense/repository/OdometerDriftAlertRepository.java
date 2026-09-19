package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.OdometerDriftAlert;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OdometerDriftAlertRepository extends JpaRepository<OdometerDriftAlert, UUID> {

    List<OdometerDriftAlert> findByOrganizationId(UUID organizationId);

    List<OdometerDriftAlert> findByOrganizationIdAndIsDismissedFalse(UUID organizationId);

    Optional<OdometerDriftAlert> findByVehicleId(UUID vehicleId);

    Optional<OdometerDriftAlert> findByVehicleIdAndIsDismissedFalse(UUID vehicleId);

    @Modifying
    @Query("UPDATE OdometerDriftAlert a SET a.isDismissed = true, a.dismissedAt = :dismissedAt, a.dismissedByUser.id = :userId WHERE a.vehicle.id = :vehicleId")
    void dismissAlertByVehicleId(@Param("vehicleId") UUID vehicleId, @Param("dismissedAt") OffsetDateTime dismissedAt, @Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM OdometerDriftAlert a WHERE a.vehicle.id = :vehicleId")
    void deleteByVehicleId(@Param("vehicleId") UUID vehicleId);
}
