package za.co.fleetexpense;

import org.junit.jupiter.api.Test;
import za.co.fleetexpense.entity.SarsCostScaleBracket;
import za.co.fleetexpense.entity.SarsPrescribedRate;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 2 Step 1 Tests - SARS Rate Tables
 * Tests for SARS cost scale brackets and prescribed rates entities and logic.
 * Plain JUnit 5 (no Spring context) following Phase 1 test pattern.
 */
public class TaxPhase2Step1Tests {

    // ==================== SarsCostScaleBracket Entity Tests ====================

    @Test
    public void testSarsCostScaleBracket_Builder_CreatesValidEntity() {
        // Test builder pattern creates valid entity
        SarsCostScaleBracket bracket = SarsCostScaleBracket.builder()
                .taxYear(2026)
                .bracketIndex(0)
                .minVehicleValueCents(10000000L)
                .maxVehicleValueCents(10000000L)
                .fixedCostCents(3394000L)
                .fuelCostTenthsCentsPerKm(1467L) // 146.7c/km stored as 1467
                .maintenanceCostTenthsCentsPerKm(474L) // 47.4c/km stored as 474
                .sourceName("SARS Travel Allowance 2025/26")
                .sourceUrl("https://www.sars.gov.za/...")
                .publishedAt(LocalDateTime.of(2025, 2, 28, 0, 0))
                .build();

        assertEquals(2026, bracket.getTaxYear());
        assertEquals(0, bracket.getBracketIndex());
        assertEquals(10000000L, bracket.getMinVehicleValueCents());
        assertEquals(10000000L, bracket.getMaxVehicleValueCents());
        assertEquals(3394000L, bracket.getFixedCostCents());
        assertEquals(1467L, bracket.getFuelCostTenthsCentsPerKm());
        assertEquals(474L, bracket.getMaintenanceCostTenthsCentsPerKm());
    }

    @Test
    public void testSarsCostScaleBracket_TopBracket_HasNullMaxValue() {
        // Test top bracket has null maxVehicleValueCents (open-ended)
        SarsCostScaleBracket topBracket = SarsCostScaleBracket.builder()
                .taxYear(2026)
                .bracketIndex(8)
                .minVehicleValueCents(80000001L)
                .maxVehicleValueCents(null) // Open-ended
                .fixedCostCents(21112100L)
                .fuelCostTenthsCentsPerKm(2429L) // 242.9c/km stored as 2429
                .maintenanceCostTenthsCentsPerKm(1225L) // 122.5c/km stored as 1225
                .sourceName("SARS Travel Allowance 2025/26")
                .sourceUrl("https://www.sars.gov.za/...")
                .publishedAt(LocalDateTime.of(2025, 2, 28, 0, 0))
                .build();

        assertNull(topBracket.getMaxVehicleValueCents());
        assertEquals(80000001L, topBracket.getMinVehicleValueCents());
    }

    // ==================== SarsPrescribedRate Entity Tests ====================

    @Test
    public void testSarsPrescribedRate_Builder_CreatesValidEntity() {
        // Test builder pattern creates valid entity
        SarsPrescribedRate rate = SarsPrescribedRate.builder()
                .taxYear(2026)
                .rateCentsPerKm(476L)
                .sourceName("SARS Travel Allowance 2025/26")
                .sourceUrl("https://www.sars.gov.za/...")
                .publishedAt(LocalDateTime.of(2025, 2, 28, 0, 0))
                .build();

        assertEquals(2026, rate.getTaxYear());
        assertEquals(476L, rate.getRateCentsPerKm());
    }

    @Test
    public void testSarsPrescribedRate_2027Rate_Is495Cents() {
        // Test 2027 prescribed rate is 495c/km (not 476)
        SarsPrescribedRate rate2027 = SarsPrescribedRate.builder()
                .taxYear(2027)
                .rateCentsPerKm(495L)
                .sourceName("SARS Travel Allowance 2026/27")
                .sourceUrl("https://www.sars.gov.za/...")
                .publishedAt(LocalDateTime.of(2026, 2, 25, 0, 0))
                .build();

        assertEquals(495L, rate2027.getRateCentsPerKm());
    }

    // ==================== Bracket Selection Logic Tests ====================

    @Test
    public void testBracketSelection_VehicleValue100000_SelectsBracket0() {
        // Vehicle value R100,000 should select bracket 0 (≤ R100,000)
        Long vehicleValueCents = 10000000L; // R100,000 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2026);
        assertEquals(0, selectedBracket);
    }

    @Test
    public void testBracketSelection_VehicleValue150000_SelectsBracket1() {
        // Vehicle value R150,000 should select bracket 1 (>R100,000–200,000)
        Long vehicleValueCents = 15000000L; // R150,000 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2026);
        assertEquals(1, selectedBracket);
    }

    @Test
    public void testBracketSelection_VehicleValue800000_SelectsBracket7() {
        // Vehicle value R800,000 should select bracket 7 (>R700,000–800,000)
        Long vehicleValueCents = 80000000L; // R800,000 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2026);
        assertEquals(7, selectedBracket);
    }

    @Test
    public void testBracketSelection_VehicleValue900000_SelectsBracket8() {
        // Vehicle value R900,000 should select bracket 8 (>R800,000, open-ended)
        Long vehicleValueCents = 90000000L; // R900,000 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2026);
        assertEquals(8, selectedBracket);
    }

    // ==================== 2027 Bracket Selection Tests ====================

    @Test
    public void testBracketSelection_2027_VehicleValue115000_SelectsBracket0() {
        // 2027: Vehicle value R115,000 should select bracket 0 (≤ R115,000)
        Long vehicleValueCents = 11500000L; // R115,000 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2027);
        assertEquals(0, selectedBracket);
    }

    @Test
    public void testBracketSelection_2027_VehicleValue114999_SelectsBracket0() {
        // 2027: Vehicle value R114,999 should select bracket 0 (≤ R115,000)
        Long vehicleValueCents = 11499900L; // R114,999 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2027);
        assertEquals(0, selectedBracket);
    }

    @Test
    public void testBracketSelection_2027_VehicleValue115001_SelectsBracket1() {
        // 2027: Vehicle value R115,001 should select bracket 1 (>R115,000–230,000)
        Long vehicleValueCents = 11500100L; // R115,001 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2027);
        assertEquals(1, selectedBracket);
    }

    @Test
    public void testBracketSelection_2027_VehicleValue920001_SelectsBracket8() {
        // 2027: Vehicle value R920,001 should select bracket 8 (>R920,000, open-ended)
        Long vehicleValueCents = 92000100L; // R920,001 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2027);
        assertEquals(8, selectedBracket);
    }

    @Test
    public void testBracketSelection_2027_VehicleValue950000_SelectsBracket8() {
        // 2027: Vehicle value R950,000 should select bracket 8 (>R920,000, open-ended)
        Long vehicleValueCents = 95000000L; // R950,000 in cents
        Integer selectedBracket = determineBracketIndex(vehicleValueCents, 2027);
        assertEquals(8, selectedBracket);
    }

    // ==================== Helper Methods ====================

    /**
     * Helper method to determine bracket index based on vehicle value and tax year.
     * This simulates the repository query logic for testing purposes.
     * 2026 brackets: 0: ≤100k, 1: >100k-200k, 2: >200k-300k, 3: >300k-400k, 4: >400k-500k,
     *               5: >500k-600k, 6: >600k-700k, 7: >700k-800k, 8: >800k
     * 2027 brackets: 0: ≤115k, 1: >115k-230k, 2: >230k-345k, 3: >345k-460k, 4: >460k-575k,
     *               5: >575k-690k, 6: >690k-805k, 7: >805k-920k, 8: >920k
     */
    private Integer determineBracketIndex(Long vehicleValueCents, Integer taxYear) {
        if (taxYear == 2026) {
            // 2026 brackets (100k steps)
            if (vehicleValueCents <= 10000000L) return 0;
            if (vehicleValueCents <= 20000000L) return 1;
            if (vehicleValueCents <= 30000000L) return 2;
            if (vehicleValueCents <= 40000000L) return 3;
            if (vehicleValueCents <= 50000000L) return 4;
            if (vehicleValueCents <= 60000000L) return 5;
            if (vehicleValueCents <= 70000000L) return 6;
            if (vehicleValueCents <= 80000000L) return 7;
            return 8; // >800k
        } else if (taxYear == 2027) {
            // 2027 brackets (115k steps)
            if (vehicleValueCents <= 11500000L) return 0;
            if (vehicleValueCents <= 23000000L) return 1;
            if (vehicleValueCents <= 34500000L) return 2;
            if (vehicleValueCents <= 46000000L) return 3;
            if (vehicleValueCents <= 57500000L) return 4;
            if (vehicleValueCents <= 69000000L) return 5;
            if (vehicleValueCents <= 80500000L) return 6;
            if (vehicleValueCents <= 92000000L) return 7;
            return 8; // >920k
        }
        throw new IllegalArgumentException("Unsupported tax year: " + taxYear);
    }
}
