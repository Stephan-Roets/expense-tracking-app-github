package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.OdometerVerification;
import za.co.fleetexpense.entity.enums.OdometerReadingType;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OdometerVerificationRepository extends JpaRepository<OdometerVerification, UUID> {

    List<OdometerVerification> findByOrganizationId(UUID organizationId);

    List<OdometerVerification> findByVehicleId(UUID vehicleId);

    @Query("SELECT ov FROM OdometerVerification ov WHERE ov.vehicle.id = :vehicleId AND ov.taxYear = :taxYear")
    List<OdometerVerification> findByVehicleAndTaxYear(@Param("vehicleId") UUID vehicleId, @Param("taxYear") Integer taxYear);

    @Query("SELECT ov FROM OdometerVerification ov WHERE ov.vehicle.id = :vehicleId AND ov.taxYear = :taxYear AND ov.readingType = :type")
    Optional<OdometerVerification> findByVehicleYearAndType(
            @Param("vehicleId") UUID vehicleId,
            @Param("taxYear") Integer taxYear,
            @Param("type") OdometerReadingType type);

    @Query("SELECT ov FROM OdometerVerification ov WHERE ov.organization.id = :orgId AND ov.isLocked = false")
    List<OdometerVerification> findUnlockedByOrganization(@Param("orgId") UUID orgId);

    @Modifying
    @Query("DELETE FROM OdometerVerification ov WHERE ov.user.id = :userId")
    int deleteByUserId(@Param("userId") UUID userId);

    @Query("SELECT ov.vehicle.id, ov.odometerValue FROM OdometerVerification ov " +
           "WHERE ov.vehicle.id IN :vehicleIds " +
           "AND ov.readingType = :type " +
           "AND ov.taxYear = :taxYear")
    Map<UUID, Integer> findOpeningOdometersByVehiclesAndTaxYear(
            @Param("vehicleIds") List<UUID> vehicleIds,
            @Param("type") OdometerReadingType type,
            @Param("taxYear") Integer taxYear);
}
