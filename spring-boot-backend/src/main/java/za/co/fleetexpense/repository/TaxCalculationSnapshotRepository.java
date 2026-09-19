package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.TaxCalculationSnapshot;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxCalculationSnapshotRepository extends JpaRepository<TaxCalculationSnapshot, UUID> {
    
    List<TaxCalculationSnapshot> findByVehicleId(UUID vehicleId);
    
    List<TaxCalculationSnapshot> findByOrganizationId(UUID organizationId);
    
    List<TaxCalculationSnapshot> findByExportId(UUID exportId);
    
    Optional<TaxCalculationSnapshot> findByExportIdAndVehicleIdAndTaxYear(
        UUID exportId, 
        UUID vehicleId, 
        Integer taxYear
    );
    
    @Query("SELECT s FROM TaxCalculationSnapshot s WHERE s.vehicle.id = :vehicleId AND s.taxYear = :taxYear ORDER BY s.calculatedAt DESC")
    List<TaxCalculationSnapshot> findByVehicleIdAndTaxYearOrderByCalculatedAtDesc(
        @Param("vehicleId") UUID vehicleId,
        @Param("taxYear") Integer taxYear
    );
}
