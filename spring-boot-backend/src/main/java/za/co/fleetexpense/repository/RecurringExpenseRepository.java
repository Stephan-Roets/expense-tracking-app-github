package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.RecurringExpense;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RecurringExpenseRepository extends JpaRepository<RecurringExpense, UUID> {

    List<RecurringExpense> findByOrganizationId(UUID organizationId);

    List<RecurringExpense> findByOrganizationIdAndVehicleId(UUID organizationId, UUID vehicleId);

    @Query("SELECT r FROM RecurringExpense r WHERE r.organization.id = :organizationId AND r.vehicle.id = :vehicleId AND r.isActive = true AND r.isRecurring = true")
    List<RecurringExpense> findActiveByOrganizationAndVehicle(@Param("organizationId") UUID organizationId, @Param("vehicleId") UUID vehicleId);

    @Query("SELECT r FROM RecurringExpense r WHERE r.organization.id = :organizationId AND r.isActive = true AND r.isRecurring = true AND r.recurrenceStartDate <= :date AND (r.recurrenceEndDate IS NULL OR r.recurrenceEndDate >= :date)")
    List<RecurringExpense> findActiveRecurringExpensesForDate(@Param("organizationId") UUID organizationId, @Param("date") LocalDate date);
}
