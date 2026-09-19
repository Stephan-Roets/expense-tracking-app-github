package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.VehicleTaxProfile;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleTaxProfileRepository extends JpaRepository<VehicleTaxProfile, UUID> {

    List<VehicleTaxProfile> findByOrganizationId(UUID organizationId);

    List<VehicleTaxProfile> findByVehicleId(UUID vehicleId);

    Optional<VehicleTaxProfile> findByVehicleIdAndEffectiveToIsNull(UUID vehicleId);

    @Query("SELECT vtp FROM VehicleTaxProfile vtp WHERE vtp.vehicle.id = :vehicleId AND vtp.effectiveFrom <= :date AND (vtp.effectiveTo IS NULL OR vtp.effectiveTo > :date)")
    Optional<VehicleTaxProfile> findActiveProfileForVehicleOnDate(@Param("vehicleId") UUID vehicleId, @Param("date") LocalDate date);

    @Query("SELECT vtp FROM VehicleTaxProfile vtp WHERE vtp.organization.id = :organizationId AND vtp.effectiveFrom <= :date AND (vtp.effectiveTo IS NULL OR vtp.effectiveTo > :date)")
    List<VehicleTaxProfile> findActiveProfilesByOrganizationOnDate(@Param("organizationId") UUID organizationId, @Param("date") LocalDate date);
}
