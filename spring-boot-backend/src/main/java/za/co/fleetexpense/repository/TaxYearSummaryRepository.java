package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.TaxYearSummary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxYearSummaryRepository extends JpaRepository<TaxYearSummary, UUID> {

    List<TaxYearSummary> findByOrganizationId(UUID organizationId);

    List<TaxYearSummary> findByVehicleId(UUID vehicleId);

    Optional<TaxYearSummary> findByVehicleIdAndTaxYear(UUID vehicleId, Integer taxYear);

    @Query("SELECT tys FROM TaxYearSummary tys WHERE tys.organization.id = :orgId AND tys.taxYear = :taxYear")
    List<TaxYearSummary> findByOrganizationAndYear(@Param("orgId") UUID orgId, @Param("taxYear") Integer taxYear);

    @Query("SELECT tys FROM TaxYearSummary tys WHERE tys.vehicle.id = :vehicleId ORDER BY tys.taxYear DESC")
    List<TaxYearSummary> findByVehicleOrderByYearDesc(@Param("vehicleId") UUID vehicleId);
}
