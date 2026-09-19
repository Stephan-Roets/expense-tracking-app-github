package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.Trip;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID> {

    List<Trip> findByOrganizationId(UUID organizationId);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.organization.id = :orgId ORDER BY t.tripDate DESC, t.createdAt DESC")
    List<Trip> findByOrganizationIdWithVehicle(@Param("orgId") UUID organizationId);

    List<Trip> findByVehicleId(UUID vehicleId);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId ORDER BY t.tripDate DESC")
    List<Trip> findByVehicleIdWithVehicle(@Param("vehicleId") UUID vehicleId);

    List<Trip> findByUserId(UUID userId);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.organization.id = :orgId AND t.user.id = :userId ORDER BY t.tripDate DESC")
    List<Trip> findByOrganizationIdAndUserIdWithVehicle(@Param("orgId") UUID organizationId, @Param("userId") UUID userId);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.organization.id = :orgId AND t.tripDate BETWEEN :start AND :end ORDER BY t.tripDate DESC")
    List<Trip> findByOrganizationAndDateRangeWithVehicle(
            @Param("orgId") UUID organizationId,
            @Param("start") LocalDate startDate,
            @Param("end") LocalDate endDate);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.organization.id = :orgId AND t.user.id = :userId AND t.tripDate BETWEEN :start AND :end ORDER BY t.tripDate DESC")
    List<Trip> findByOrganizationIdAndUserIdAndDateRangeWithVehicle(
            @Param("orgId") UUID organizationId,
            @Param("userId") UUID userId,
            @Param("start") LocalDate startDate,
            @Param("end") LocalDate endDate);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.organization.id = :orgId AND t.purpose = :purpose ORDER BY t.tripDate DESC")
    List<Trip> findByOrganizationAndPurposeWithVehicle(
            @Param("orgId") UUID organizationId,
            @Param("purpose") TripPurpose purpose);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.organization.id = :orgId AND t.user.id = :userId AND t.purpose = :purpose ORDER BY t.tripDate DESC")
    List<Trip> findByOrganizationIdAndUserIdAndPurposeWithVehicle(
            @Param("orgId") UUID organizationId,
            @Param("userId") UUID userId,
            @Param("purpose") TripPurpose purpose);

    @Query("SELECT t FROM Trip t WHERE t.organization.id = :orgId AND t.tripDate BETWEEN :start AND :end")
    List<Trip> findByOrganizationAndDateRange(
            @Param("orgId") UUID organizationId,
            @Param("start") LocalDate startDate,
            @Param("end") LocalDate endDate);

    List<Trip> findByOrganizationIdAndTripDateBetween(UUID organizationId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT t FROM Trip t WHERE t.organization.id = :orgId AND t.user.id = :userId AND t.tripDate BETWEEN :start AND :end")
    List<Trip> findByOrganizationIdAndUserIdAndDateRange(
            @Param("orgId") UUID organizationId,
            @Param("userId") UUID userId,
            @Param("start") LocalDate startDate,
            @Param("end") LocalDate endDate);

    @Query("SELECT t FROM Trip t WHERE t.organization.id = :orgId AND t.purpose = :purpose")
    List<Trip> findByOrganizationAndPurpose(
            @Param("orgId") UUID organizationId,
            @Param("purpose") TripPurpose purpose);

    @Query("SELECT t FROM Trip t WHERE t.organization.id = :orgId AND t.user.id = :userId AND t.purpose = :purpose")
    List<Trip> findByOrganizationIdAndUserIdAndPurpose(
            @Param("orgId") UUID organizationId,
            @Param("userId") UUID userId,
            @Param("purpose") TripPurpose purpose);

    @Query("SELECT t FROM Trip t WHERE t.vehicle.id = :vehicleId AND t.isLocked = false")
    List<Trip> findUnlockedByVehicle(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT t FROM Trip t WHERE t.vehicle.id = :vehicleId ORDER BY t.tripDate DESC, t.createdAt DESC")
    List<Trip> findTopByVehicleIdOrderByEndDateDesc(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT t FROM Trip t WHERE t.vehicle.id = :vehicleId AND t.tripDate = :date")
    List<Trip> findByVehicleIdAndDate(@Param("vehicleId") UUID vehicleId, @Param("date") LocalDate date);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId ORDER BY t.tripDate DESC, t.createdAt DESC")
    List<Trip> findTopByVehicleIdOrderByEndDateDescWithVehicle(@Param("vehicleId") UUID vehicleId);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId AND t.purpose = :purpose ORDER BY t.tripDate DESC, t.createdAt DESC")
    List<Trip> findTopByVehicleIdAndPurposeOrderByEndDateDescWithVehicle(@Param("vehicleId") UUID vehicleId, @Param("purpose") TripPurpose purpose);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId AND t.purpose = :purpose ORDER BY t.tripDate DESC, t.startTime DESC")
    List<Trip> findTopByVehicleIdAndPurposeOrderByTripDateDescStartTimeDesc(@Param("vehicleId") UUID vehicleId, @Param("purpose") TripPurpose purpose);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId AND t.purpose = :purpose AND (:startTime IS NULL AND t.tripDate < :tripDate) OR (:startTime IS NOT NULL AND ((t.tripDate < :tripDate) OR (t.tripDate = :tripDate AND t.startTime < :startTime))) ORDER BY t.tripDate DESC, t.startTime DESC")
    List<Trip> findTopByVehicleIdAndPurposeAndChronologyBeforeOrderByTripDateDescStartTimeDesc(@Param("vehicleId") UUID vehicleId, @Param("purpose") TripPurpose purpose, @Param("tripDate") LocalDate tripDate, @Param("startTime") String startTime);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId AND t.purpose = :purpose AND t.tripDate < :tripDate ORDER BY t.tripDate DESC, t.startTime DESC")
    List<Trip> findTopByVehicleIdAndPurposeAndTripDateBeforeOrderByTripDateDescStartTimeDesc(@Param("vehicleId") UUID vehicleId, @Param("purpose") TripPurpose purpose, @Param("tripDate") LocalDate tripDate);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.id = :id")
    Optional<Trip> findByIdWithVehicle(@Param("id") UUID id);

    @Query(value = "SELECT * FROM v_trip_summary WHERE vehicle_id = CAST(:vehicleId AS UUID)", nativeQuery = true)
    java.util.Map<String, Object> findTripSummaryByVehicle(@Param("vehicleId") UUID vehicleId);

    @Query(value = "SELECT COALESCE(SUM(total_trips), 0) as total_trips, COALESCE(SUM(business_trips), 0) as business_trips, COALESCE(SUM(private_trips), 0) as private_trips, COALESCE(SUM(total_km), 0) as total_km, COALESCE(SUM(business_km), 0) as business_km, COALESCE(SUM(private_km), 0) as private_km, CASE WHEN COALESCE(SUM(total_km), 0) > 0 THEN ROUND((COALESCE(SUM(business_km), 0)::NUMERIC / COALESCE(SUM(total_km), 0) * 100), 0) ELSE 0 END as business_percentage FROM v_trip_summary", nativeQuery = true)
    java.util.Map<String, Object> findTripSummaryAll();

    @Query("SELECT t FROM Trip t WHERE t.vehicle.id = :vehicleId AND t.startLocation = :startLocation AND t.endLocation = :endLocation AND t.endOdometer IS NOT NULL AND t.startOdometer IS NOT NULL ORDER BY t.tripDate DESC")
    List<Trip> findByVehicleAndRoute(@Param("vehicleId") UUID vehicleId, @Param("startLocation") String startLocation, @Param("endLocation") String endLocation);

    @Query("SELECT t FROM Trip t LEFT JOIN FETCH t.organization LEFT JOIN FETCH t.vehicle LEFT JOIN FETCH t.user WHERE t.vehicle.id = :vehicleId AND t.tripDate = :date ORDER BY t.startTime")
    List<Trip> findByVehicleIdAndDateWithStartTime(@Param("vehicleId") UUID vehicleId, @Param("date") LocalDate date);

    @Query("""
        SELECT t.vehicle.id, t.purpose, SUM(t.distanceKm)
        FROM Trip t
        WHERE t.vehicle.id IN :vehicleIds
        AND t.tripDate >= :taxYearStart
        AND t.tripDate < :taxYearEndExcl
        GROUP BY t.vehicle.id, t.purpose
        """)
    List<Object[]> findDistanceTotalsByVehiclesAndDateRange(
        @Param("vehicleIds") List<UUID> vehicleIds,
        @Param("taxYearStart") LocalDate taxYearStart,
        @Param("taxYearEndExcl") LocalDate taxYearEndExcl
    );

    @Query("SELECT COALESCE(SUM(t.distanceKm), 0) FROM Trip t WHERE t.vehicle.id = :vehicleId AND t.tripDate >= :taxYearStart AND t.tripDate < :taxYearEnd")
    Integer getTotalKmByVehicleAndTaxYear(@Param("vehicleId") UUID vehicleId, @Param("taxYearStart") LocalDate taxYearStart, @Param("taxYearEnd") LocalDate taxYearEnd);

    @Query("SELECT COALESCE(SUM(t.distanceKm), 0) FROM Trip t WHERE t.vehicle.id = :vehicleId AND t.purpose = 'BUSINESS' AND t.tripDate >= :taxYearStart AND t.tripDate < :taxYearEnd")
    Integer getBusinessKmByVehicleAndTaxYear(@Param("vehicleId") UUID vehicleId, @Param("taxYearStart") LocalDate taxYearStart, @Param("taxYearEnd") LocalDate taxYearEnd);
}