package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.Expense;
import za.co.fleetexpense.entity.enums.ExpenseCategory;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    
    List<Expense> findByOrganizationIdOrderByExpenseDateDesc(UUID organizationId);
    
    List<Expense> findByOrganizationIdAndCategoryOrderByExpenseDateDesc(UUID organizationId, ExpenseCategory category);
    List<Expense> findByOrganizationIdAndUserIdAndCategoryOrderByExpenseDateDesc(UUID organizationId, UUID userId, ExpenseCategory category);

    List<Expense> findByOrganizationIdAndVehicleIdOrderByExpenseDateDesc(UUID organizationId, UUID vehicleId);
    List<Expense> findByOrganizationIdAndUserIdAndVehicleIdOrderByExpenseDateDesc(UUID organizationId, UUID userId, UUID vehicleId);

    @Query("SELECT e FROM Expense e WHERE e.organization.id = :orgId AND e.expenseDate BETWEEN :start AND :end ORDER BY e.expenseDate DESC")
    List<Expense> findByOrganizationIdAndDateRange(@Param("orgId") UUID orgId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT e FROM Expense e WHERE e.organization.id = :orgId AND e.user.id = :userId AND e.expenseDate BETWEEN :start AND :end ORDER BY e.expenseDate DESC")
    List<Expense> findByOrganizationIdAndUserIdAndDateRange(@Param("orgId") UUID orgId, @Param("userId") UUID userId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    List<Expense> findByOrganizationIdAndUserIdOrderByExpenseDateDesc(UUID organizationId, UUID userId);

    List<Expense> findByOrganizationIdAndExpenseDate(UUID organizationId, LocalDate expenseDate);

    List<Expense> findByOrganizationIdAndExpenseDateBetween(UUID organizationId, LocalDate startDate, LocalDate endDate);

    List<Expense> findByVehicleId(UUID vehicleId);

    @Query("SELECT e FROM Expense e LEFT JOIN FETCH e.vehicle LEFT JOIN FETCH e.user WHERE e.organization.id = :orgId AND e.category IN ('FUEL_LOG', 'OTHER_FIXED') AND e.id NOT IN (SELECT DISTINCT i.entryId FROM EntryImage i WHERE i.entryType = 'EXPENSE')")
    List<Expense> findExpensesWithoutReceiptImages(@Param("orgId") UUID orgId);

    @Query("""
        SELECT MAX(e.odometerReading)
        FROM Expense e
        LEFT JOIN e.mechanicService ms
        WHERE e.vehicle.id = :vehicleId
        AND e.odometerReading IS NOT NULL
        AND (
            e.category = 'FUEL_LOG'
            OR e.category = 'TIRES'
            OR (e.category = 'MECHANIC_SERVICE' AND ms.serviceType IN ('MAJOR_SERVICE', 'MINOR_SERVICE', 'BRAKE_OVERHAUL'))
        )
        """)
    Optional<Integer> findMaxOdometerByVehicleId(@Param("vehicleId") UUID vehicleId);

    @Query("""
        SELECT e.vehicle.id, MAX(e.odometerReading)
        FROM Expense e
        LEFT JOIN e.mechanicService ms
        WHERE e.vehicle.id IN :vehicleIds
        AND e.odometerReading IS NOT NULL
        AND (
            e.category = 'FUEL_LOG'
            OR e.category = 'TIRES'
            OR (e.category = 'MECHANIC_SERVICE' AND ms.serviceType IN ('MAJOR_SERVICE', 'MINOR_SERVICE', 'BRAKE_OVERHAUL'))
        )
        GROUP BY e.vehicle.id
        """)
    List<Object[]> findMaxOdometersForVehicles(@Param("vehicleIds") List<UUID> vehicleIds);

    // Fuel-only MAX for detecting fuel chain drift
    @Query("""
        SELECT MAX(e.odometerReading)
        FROM Expense e
        WHERE e.vehicle.id = :vehicleId
        AND e.odometerReading IS NOT NULL
        AND e.category = 'FUEL_LOG'
        """)
    Optional<Integer> findMaxFuelOdometerByVehicleId(@Param("vehicleId") UUID vehicleId);

    // Mechanic-only MAX for detecting mechanic service drift
    @Query("""
        SELECT MAX(e.odometerReading)
        FROM Expense e
        LEFT JOIN e.mechanicService ms
        WHERE e.vehicle.id = :vehicleId
        AND e.odometerReading IS NOT NULL
        AND e.category = 'MECHANIC_SERVICE'
        AND ms.serviceType IN ('MAJOR_SERVICE', 'MINOR_SERVICE', 'BRAKE_OVERHAUL')
        """)
    Optional<Integer> findMaxMechanicOdometerByVehicleId(@Param("vehicleId") UUID vehicleId);

    // Tyre-only MAX for detecting tyre rotation drift
    @Query("""
        SELECT MAX(e.odometerReading)
        FROM Expense e
        WHERE e.vehicle.id = :vehicleId
        AND e.odometerReading IS NOT NULL
        AND e.category = 'TIRES'
        """)
    Optional<Integer> findMaxTyreOdometerByVehicleId(@Param("vehicleId") UUID vehicleId);

    // Odometer summary by category (for debugging drift issues)
    @Query("""
        SELECT e.category, COUNT(e.id), MAX(e.odometerReading)
        FROM Expense e
        WHERE e.vehicle.id = :vehicleId
        AND e.odometerReading IS NOT NULL
        GROUP BY e.category
        """)
    List<Object[]> findOdometerSummaryByVehicleId(@Param("vehicleId") UUID vehicleId);

    // Phase 1 Fix: Batch query for closing odometer readings by vehicle_id and SARS tax year
    // Returns: vehicle_id, MAX(odometer_reading) as closing
    // Closing readings come from expenses.odometer_reading
    @Query("""
        SELECT e.vehicle.id, MAX(e.odometerReading)
        FROM Expense e
        WHERE e.vehicle.id IN :vehicleIds
        AND e.odometerReading IS NOT NULL
        AND e.expenseDate >= :taxYearStart AND e.expenseDate < :taxYearEndExcl
        GROUP BY e.vehicle.id
        """)
    List<Object[]> findClosingOdometersByVehiclesAndDateRange(
        @Param("vehicleIds") List<UUID> vehicleIds,
        @Param("taxYearStart") LocalDate taxYearStart,
        @Param("taxYearEndExcl") LocalDate taxYearEndExcl
    );

    // Phase 1 Fix: Batch query for classified expense sums by vehicle_id and SARS tax year
    // Returns: vehicle_id, SUM(amount_zar * 100) for each classification (converted to cents)
    @Query("""
        SELECT e.vehicle.id, e.taxExpenseClassification, SUM(e.amountZar * 100)
        FROM Expense e
        WHERE e.vehicle.id IN :vehicleIds
        AND e.expenseDate >= :taxYearStart AND e.expenseDate < :taxYearEndExcl
        GROUP BY e.vehicle.id, e.taxExpenseClassification
        """)
    List<Object[]> findExpenseClassificationSumsByVehiclesAndDateRange(
        @Param("vehicleIds") List<UUID> vehicleIds,
        @Param("taxYearStart") LocalDate taxYearStart,
        @Param("taxYearEndExcl") LocalDate taxYearEndExcl
    );

    // Get max fuel odometer for a vehicle in a tax year (for Total KM calculation)
    @Query("""
        SELECT MAX(e.odometerReading)
        FROM Expense e
        WHERE e.vehicle.id = :vehicleId
        AND e.category = 'FUEL_LOG'
        AND e.odometerReading IS NOT NULL
        AND e.expenseDate >= :taxYearStart
        AND e.expenseDate < :taxYearEndExcl
        """)
    Optional<Integer> findMaxFuelOdometerByVehicleAndTaxYear(
        @Param("vehicleId") UUID vehicleId,
        @Param("taxYearStart") LocalDate taxYearStart,
        @Param("taxYearEndExcl") LocalDate taxYearEndExcl
    );
}
