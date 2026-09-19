package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.VehicleConditionSection;

import java.util.UUID;

@Repository
public interface VehicleConditionSectionRepository extends JpaRepository<VehicleConditionSection, UUID> {
}
