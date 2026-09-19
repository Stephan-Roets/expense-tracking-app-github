package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.VehicleFuelConsumptionStats;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleFuelConsumptionStatsRepository extends JpaRepository<VehicleFuelConsumptionStats, UUID> {

    Optional<VehicleFuelConsumptionStats> findByVehicleId(UUID vehicleId);

    boolean existsByVehicleId(UUID vehicleId);
}
