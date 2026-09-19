package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.SarsPrescribedRate;

import java.util.Optional;

@Repository
public interface SarsPrescribedRateRepository extends JpaRepository<SarsPrescribedRate, Long> {

    Optional<SarsPrescribedRate> findByTaxYear(Integer taxYear);
}
