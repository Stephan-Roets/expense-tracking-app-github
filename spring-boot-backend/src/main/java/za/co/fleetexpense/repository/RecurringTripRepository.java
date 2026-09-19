package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.RecurringTrip;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecurringTripRepository extends JpaRepository<RecurringTrip, UUID> {

    List<RecurringTrip> findByOrganizationId(UUID organizationId);

    List<RecurringTrip> findByOrganizationIdAndVehicleId(UUID organizationId, UUID vehicleId);

    List<RecurringTrip> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    List<RecurringTrip> findByOrganizationIdAndIsActiveTrue(UUID organizationId);

    List<RecurringTrip> findByOrganizationIdAndVehicleIdAndIsActiveTrue(UUID organizationId, UUID vehicleId);

    @Query("SELECT rt FROM RecurringTrip rt WHERE rt.organization.id = :orgId " +
           "AND rt.isActive = true AND rt.isRecurring = true " +
           "AND rt.recurrenceStartDate <= :date " +
           "AND (rt.recurrenceEndDate IS NULL OR rt.recurrenceEndDate >= :date)")
    List<RecurringTrip> findActiveRecurringTripsForDate(@Param("orgId") UUID orgId, @Param("date") LocalDate date);

    @Query("SELECT rt FROM RecurringTrip rt WHERE rt.organization.id = :orgId " +
           "AND rt.vehicle.id = :vehicleId AND rt.isActive = true " +
           "ORDER BY rt.createdAt DESC")
    List<RecurringTrip> findActiveByOrganizationAndVehicle(@Param("orgId") UUID orgId, @Param("vehicleId") UUID vehicleId);
}
