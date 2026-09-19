package za.co.fleetexpense;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.TestPropertySource;
import za.co.fleetexpense.entity.*;
import za.co.fleetexpense.entity.enums.CompensationType;
import za.co.fleetexpense.entity.enums.FuelType;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.entity.enums.TaxpayerType;
import za.co.fleetexpense.repository.SarsCostScaleBracketRepository;
import za.co.fleetexpense.repository.SarsPrescribedRateRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;
import za.co.fleetexpense.service.TaxCalculationService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5433/expense_tracking_app",
    "spring.datasource.username=stefan",
    "spring.datasource.password=test123",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.flyway.enabled=false"
})
public class TaxCalculationServiceTests {

    @Autowired
    private SarsCostScaleBracketRepository costScaleBracketRepository;

    @Autowired
    private SarsPrescribedRateRepository prescribedRateRepository;

    @Autowired
    private VehicleTaxProfileRepository taxProfileRepository;

    private TaxCalculationService taxCalculationService;

    @BeforeEach
    void setUp() {
        taxCalculationService = new TaxCalculationService(
                costScaleBracketRepository,
                prescribedRateRepository,
                taxProfileRepository
        );
    }

    @Test
    void testActualCosts_EmployeeAllowance() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal qualifyingCurrentExpenseCents = BigDecimal.valueOf(10000000L); // R100,000
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateActualCosts(
                profile,
                qualifyingCurrentExpenseCents,
                businessKm,
                totalKm,
                taxYearStart,
                taxYearEnd
        );
        
        assertNotNull(result);
        assertEquals("ACTUAL_COSTS", result.getMethod());
        assertTrue(result.getEligible());
        assertEquals(0.5, result.getBusinessShare().doubleValue(), 0.001);
        // R100,000 × 0.5 = R50,000
        assertEquals(5000000L, result.getTotalDeductionCents().longValue());
    }

    @Test
    void testActualCosts_SoleProprietor_WithWearAndTear() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.SOLE_PROPRIETOR);
        profile.setDatePlacedInBusinessUse(LocalDate.of(2020, 1, 1)); // 6 years old
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal qualifyingCurrentExpenseCents = BigDecimal.valueOf(10000000L);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateActualCosts(
                profile,
                qualifyingCurrentExpenseCents,
                businessKm,
                totalKm,
                taxYearStart,
                taxYearEnd
        );
        
        assertNotNull(result);
        assertEquals("ACTUAL_COSTS", result.getMethod());
        assertTrue(result.getEligible());
        // Should include wear-and-tear (vehicle is 6 years old, claimYears = 0 due to clamp)
        assertTrue(result.getFixedCostCents().compareTo(BigDecimal.ZERO) >= 0);
    }

    @Test
    void testActualCosts_WearAndTear_Year6_ClampedToZero() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.SOLE_PROPRIETOR);
        profile.setDatePlacedInBusinessUse(LocalDate.of(2015, 1, 1)); // 11 years old
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal qualifyingCurrentExpenseCents = BigDecimal.valueOf(10000000L);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateActualCosts(
                profile,
                qualifyingCurrentExpenseCents,
                businessKm,
                totalKm,
                taxYearStart,
                taxYearEnd
        );
        
        assertNotNull(result);
        assertEquals("ACTUAL_COSTS", result.getMethod());
        // Year 6+ should have claimYears = 0 due to clamp, so no wear-and-tear
        assertEquals(BigDecimal.ZERO, result.getFixedCostCents());
    }

    @Test
    void testSarsCostScale_EmployeeAllowance_Bracket0() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals("SARS_COST_SCALE", result.getMethod());
        assertTrue(result.getEligible());
        assertEquals(0.5, result.getBusinessShare().doubleValue(), 0.001);
        assertNotNull(result.getTotalDeductionCents());
    }

    @Test
    void testSarsCostScale_BusinessUseDays_CappedByPlacementDate() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setDatePlacedInBusinessUse(LocalDate.of(2026, 6, 1)); // Placed mid-year
        profile.setEffectiveFrom(LocalDate.of(2026, 6, 1));
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals("SARS_COST_SCALE", result.getMethod());
        // Business use days should be capped by placement date (June 1 to Feb 28 = ~274 days)
        assertTrue(result.getBusinessUseDays() < 365);
        assertTrue(result.getBusinessUseDays() > 250);
    }

    @Test
    void testSarsCostScale_NonLeapYear_DaysInTaxYear() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setEffectiveFrom(LocalDate.of(2026, 3, 1)); // 2027 tax year
        
        // taxYear 2027: 1 Mar 2026 -> 28 Feb 2027 = 365 days (no leap day)
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals("SARS_COST_SCALE", result.getMethod());
        // 2027 tax year (Mar 1 2026 - Feb 28 2027) = 365 days (no leap day)
        assertEquals(365, result.getDaysInTaxYear());
    }

    @Test
    void testComputeDaysInTaxYear_2026_365() {
        LocalDate taxYearStart = LocalDate.of(2025, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2026, 2, 28);
        assertEquals(365, taxCalculationService.computeDaysInTaxYear(taxYearStart, taxYearEnd));
    }

    @Test
    void testComputeDaysInTaxYear_2027_365() {
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        assertEquals(365, taxCalculationService.computeDaysInTaxYear(taxYearStart, taxYearEnd));
    }

    @Test
    void testComputeDaysInTaxYear_2028_366() {
        LocalDate taxYearStart = LocalDate.of(2027, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2028, 2, 29);
        assertEquals(366, taxCalculationService.computeDaysInTaxYear(taxYearStart, taxYearEnd));
    }

    @Test
    void testSarsCostScale_ZeroTotalKm_NoDivisionError() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.ZERO;
        BigDecimal totalKm = BigDecimal.ZERO;
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals("SARS_COST_SCALE", result.getMethod());
        // Should not divide by zero - business share should be 0
        assertEquals(BigDecimal.ZERO, result.getBusinessShare());
    }

    @Test
    void testSarsCostScale_FuelEmployee_IncludesFuel() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertTrue(result.getFuelCostCents().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    void testSarsCostScale_FuelComponent_ExactValue_NoDoubleShare() {
        VehicleTaxProfile profile = createTestProfile(10000000L, "EMPLOYEE", "EMPLOYEE"); // R100,000 to use bracket 0
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setFuelBorneBy("EMPLOYEE");
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000); // business share = 0.5
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        // Fuel component = rate × businessKm / 10 (no business share multiplication)
        // For bracket 0 in 2027: fuel rate = 1329 tenths/km
        // Expected: 1329 × 10000 / 10 = 1,329,000 cents
        // This test verifies the double-share bug is fixed
        assertEquals(0, result.getFuelCostCents().compareTo(new BigDecimal("1329000")));
    }

    @Test
    void testSarsCostScale_FuelEmployer_ExcludesFuel() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYER", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getFuelCostCents());
    }

    @Test
    void testSarsCostScale_FuelShared_ExcludesFuel() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "SHARED", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getFuelCostCents());
    }

    @Test
    void testSarsCostScale_MaintenanceEmployee_NoPlan_IncludesMaintenance() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setCoveredByMaintenancePlan(false);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertTrue(result.getMaintenanceCostCents().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    void testSarsCostScale_MaintenanceEmployee_WithPlan_ExcludesMaintenance() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setCoveredByMaintenancePlan(true);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getMaintenanceCostCents());
    }

    @Test
    void testSarsCostScale_MaintenanceEmployer_ExcludesMaintenance() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYER");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setCoveredByMaintenancePlan(false);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getMaintenanceCostCents());
    }

    @Test
    void testSimplifiedReimbursive_EmployeeReimbursement() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.REIMBURSEMENT);
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        
        var result = taxCalculationService.calculateSimplifiedReimbursive(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm
        );
        
        assertNotNull(result);
        assertEquals("SIMPLIFIED_REIMBURSIVE", result.getMethod());
        assertTrue(result.getEligible());
        assertNotNull(result.getTotalDeductionCents());
    }

    @Test
    void testSimplifiedReimbursive_2027TaxYear_Uses2027Rate() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        // taxYear 2027: 1 Mar 2026 -> 28 Feb 2027
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        
        var result = taxCalculationService.calculateSimplifiedReimbursive(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm
        );
        
        assertNotNull(result);
        assertEquals("SIMPLIFIED_REIMBURSIVE", result.getMethod());
        assertTrue(result.getEligible());
        // Verify 2027 rate is used (taxYearEnd.getYear() = 2027)
        // 2027 rate = 495 cents/km, businessKm = 10,000
        // Expected: 495 × 10,000 = 4,950,000 cents
        assertEquals(0, result.getTotalDeductionCents().compareTo(new BigDecimal("4950000")));
    }

    @Test
    void testEligibility_ActualCosts_EmployeeAllowance_Eligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.ACTUAL_COSTS,
                profile,
                businessKm,
                totalKm
        );
        
        assertTrue(eligible);
    }

    @Test
    void testEligibility_ActualCosts_EmployeeReimbursement_NotEligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.REIMBURSEMENT);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.ACTUAL_COSTS,
                profile,
                businessKm,
                totalKm
        );
        
        assertFalse(eligible);
        String reason = taxCalculationService.getIneligibilityReason(
                TaxCalculationMethod.ACTUAL_COSTS,
                profile
        );
        assertNotNull(reason);
        assertTrue(reason.contains("ALLOWANCE"));
    }

    @Test
    void testEligibility_SarsCostScale_EmployeeReimbursement_NotEligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.REIMBURSEMENT);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile,
                BigDecimal.valueOf(10000),
                BigDecimal.valueOf(20000)
        );
        
        assertFalse(eligible);
        String reason = taxCalculationService.getIneligibilityReason(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile
        );
        assertNotNull(reason);
        assertTrue(reason.contains("ALLOWANCE"));
    }

    @Test
    void testEligibility_ActualCosts_SoleProprietor_Eligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.SOLE_PROPRIETOR);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.ACTUAL_COSTS,
                profile,
                businessKm,
                totalKm
        );
        
        assertTrue(eligible);
    }

    @Test
    void testSarsCostScale_PlacementDateCapsBusinessUseDays() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        profile.setEffectiveFrom(LocalDate.of(2025, 1, 1)); // Predates tax year
        profile.setDatePlacedInBusinessUse(LocalDate.of(2026, 7, 1)); // Mid-year placement
        
        LocalDate taxYearStart = LocalDate.of(2026, 3, 1);
        LocalDate taxYearEnd = LocalDate.of(2027, 2, 28);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        var result = taxCalculationService.calculateSarsCostScale(
                profile,
                taxYearStart,
                taxYearEnd,
                businessKm,
                totalKm
        );
        
        assertNotNull(result);
        assertEquals("SARS_COST_SCALE", result.getMethod());
        // Business use days should be from placement date (Jul 1) to tax year end (Feb 28)
        // Jul 1 2026 to Feb 28 2027 = ~243 days
        assertTrue(result.getBusinessUseDays() < 365);
        assertTrue(result.getBusinessUseDays() > 200);
    }

    @Test
    void testEligibility_SarsCostScale_EmployeeReimbursement_NotApplicable() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.REIMBURSEMENT);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile,
                BigDecimal.valueOf(10000),
                BigDecimal.valueOf(20000)
        );
        
        assertFalse(eligible);
        String reason = taxCalculationService.getIneligibilityReason(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile
        );
        assertNotNull(reason);
        assertTrue(reason.contains("ALLOWANCE"));
    }

    @Test
    void testEligibility_ActualCosts_Company_Eligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.COMPANY);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.ACTUAL_COSTS,
                profile,
                businessKm,
                totalKm
        );
        
        assertTrue(eligible);
    }

    @Test
    void testEligibility_SarsCostScale_EmployeeAllowance_Eligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile,
                businessKm,
                totalKm
        );
        
        assertTrue(eligible);
    }

    @Test
    void testEligibility_SarsCostScale_SoleProprietor_NotEligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.SOLE_PROPRIETOR);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile,
                businessKm,
                totalKm
        );
        
        assertFalse(eligible);
    }

    @Test
    void testEligibility_SimplifiedReimbursive_EmployeeReimbursement_Eligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.REIMBURSEMENT);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.SIMPLIFIED_REIMBURSIVE,
                profile,
                businessKm,
                totalKm
        );
        
        assertTrue(eligible);
    }

    @Test
    void testEligibility_SimplifiedReimbursive_EmployeeAllowance_NotEligible() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        BigDecimal businessKm = BigDecimal.valueOf(10000);
        BigDecimal totalKm = BigDecimal.valueOf(20000);
        
        boolean eligible = taxCalculationService.isEligibleForMethod(
                TaxCalculationMethod.SIMPLIFIED_REIMBURSIVE,
                profile,
                businessKm,
                totalKm
        );
        
        assertFalse(eligible);
    }

    @Test
    void testIneligibilityReason_SarsCostScale_NotEmployeeAllowance() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.REIMBURSEMENT);
        
        String reason = taxCalculationService.getIneligibilityReason(
                TaxCalculationMethod.SARS_COST_SCALE,
                profile
        );
        
        assertNotNull(reason);
        assertTrue(reason.contains("EMPLOYEE+ALLOWANCE"));
    }

    @Test
    void testIneligibilityReason_SimplifiedReimbursive_NotEmployeeReimbursement() {
        VehicleTaxProfile profile = createTestProfile(15000000L, "EMPLOYEE", "EMPLOYEE");
        profile.setTaxpayerType(TaxpayerType.EMPLOYEE);
        profile.setCompensationType(CompensationType.TRAVEL_ALLOWANCE);
        
        String reason = taxCalculationService.getIneligibilityReason(
                TaxCalculationMethod.SIMPLIFIED_REIMBURSIVE,
                profile
        );
        
        assertNotNull(reason);
        assertTrue(reason.contains("EMPLOYEE+REIMBURSEMENT"));
    }

    private VehicleTaxProfile createTestProfile(Long vehicleCostCents, String fuelBorneBy, String maintenanceBorneBy) {
        Organization org = Organization.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .build();
        
        Vehicle vehicle = Vehicle.builder()
                .id(UUID.randomUUID())
                .organization(org)
                .registrationNumber("TEST123")
                .make("Toyota")
                .model("Corolla")
                .year(2020)
                .fuelType(FuelType.PETROL_UNLEADED_95)
                .build();
        
        return VehicleTaxProfile.builder()
                .id(UUID.randomUUID())
                .organization(org)
                .vehicle(vehicle)
                .vehicleCostCents(vehicleCostCents)
                .datePlacedInBusinessUse(LocalDate.of(2026, 3, 1))
                .taxpayerVatRegistered(false)
                .taxpayerType(TaxpayerType.EMPLOYEE)
                .compensationType(CompensationType.TRAVEL_ALLOWANCE)
                .fuelBorneBy(fuelBorneBy)
                .maintenanceBorneBy(maintenanceBorneBy)
                .coveredByMaintenancePlan(false)
                .effectiveFrom(LocalDate.of(2026, 3, 1))
                .effectiveTo(null)
                .build();
    }
}

