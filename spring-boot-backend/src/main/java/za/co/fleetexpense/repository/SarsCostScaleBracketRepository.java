package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.SarsCostScaleBracket;

import java.util.List;
import java.util.Optional;

@Repository
public interface SarsCostScaleBracketRepository extends JpaRepository<SarsCostScaleBracket, Long> {

    List<SarsCostScaleBracket> findByTaxYearOrderByBracketIndexAsc(Integer taxYear);

    @Query("""
        SELECT b FROM SarsCostScaleBracket b
        WHERE b.taxYear = :taxYear
          AND b.minVehicleValueCents <= :vehicleValueCents
          AND (b.maxVehicleValueCents IS NULL OR b.maxVehicleValueCents > :vehicleValueCents)
        ORDER BY b.bracketIndex ASC
        """)
    Optional<SarsCostScaleBracket> findByTaxYearAndVehicleValue(
        @Param("taxYear") Integer taxYear,
        @Param("vehicleValueCents") Long vehicleValueCents
    );
}
