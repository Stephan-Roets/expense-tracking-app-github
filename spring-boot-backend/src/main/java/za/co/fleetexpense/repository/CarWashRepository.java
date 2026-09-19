package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.CarWash;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CarWashRepository extends JpaRepository<CarWash, UUID> {

    Optional<CarWash> findByExpenseId(UUID expenseId);
}
