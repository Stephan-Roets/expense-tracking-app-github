package za.co.fleetexpense;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;
import za.co.fleetexpense.entity.SarsCostScaleBracket;
import za.co.fleetexpense.repository.SarsCostScaleBracketRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 2 Step 1 Integration Tests - Real Repository Tests
 * Tests bracket selection against the actual database query.
 * Connects to the disposable PostgreSQL container.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5433/expense_tracking_app",
    "spring.datasource.username=stefan",
    "spring.datasource.password=test123",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.flyway.enabled=false"
})
public class TaxPhase2Step1IntegrationTests {

    @Autowired
    private SarsCostScaleBracketRepository repository;

    @Test
    public void testBracketSelection_2026_ExactBoundary_R100000_SelectsBracket0() {
        // 2026: Vehicle value exactly R100,000 should select bracket 0 (≤ R100,000)
        Long vehicleValueCents = 10000000L; // R100,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(0, bracket.get().getBracketIndex(), "R100,000 should select bracket 0");
    }

    @Test
    public void testBracketSelection_2026_BoundaryPlusOne_R100001_SelectsBracket1() {
        // 2026: Vehicle value R100,000.01 should select bracket 1 (>R100,000–200,000)
        Long vehicleValueCents = 10000001L; // R100,000.01 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(1, bracket.get().getBracketIndex(), "R100,000.01 should select bracket 1");
    }

    @Test
    public void testBracketSelection_2026_ExactBoundary_R200000_SelectsBracket1() {
        // 2026: Vehicle value exactly R200,000 should select bracket 1 (>R100,000–200,000)
        Long vehicleValueCents = 20000000L; // R200,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(1, bracket.get().getBracketIndex(), "R200,000 should select bracket 1");
    }

    @Test
    public void testBracketSelection_2026_BoundaryPlusOne_R200001_SelectsBracket2() {
        // 2026: Vehicle value R200,000.01 should select bracket 2 (>R200,000–300,000)
        Long vehicleValueCents = 20000001L; // R200,000.01 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(2, bracket.get().getBracketIndex(), "R200,000.01 should select bracket 2");
    }

    @Test
    public void testBracketSelection_2026_TopBracketBoundary_R800000_SelectsBracket7() {
        // 2026: Vehicle value exactly R800,000 should select bracket 7 (>R700,000–800,000)
        Long vehicleValueCents = 80000000L; // R800,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(7, bracket.get().getBracketIndex(), "R800,000 should select bracket 7");
    }

    @Test
    public void testBracketSelection_2026_TopBracketBoundaryPlusOne_R800001_SelectsBracket8() {
        // 2026: Vehicle value R800,000.01 should select bracket 8 (>R800,000, open-ended)
        Long vehicleValueCents = 80000001L; // R800,000.01 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(8, bracket.get().getBracketIndex(), "R800,000.01 should select bracket 8");
    }

    @Test
    public void testBracketSelection_2026_VeryHighValue_R1000000_SelectsBracket8() {
        // 2026: Vehicle value R1,000,000 should select bracket 8 (open-ended)
        Long vehicleValueCents = 100000000L; // R1,000,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(8, bracket.get().getBracketIndex(), "R1,000,000 should select bracket 8");
    }

    @Test
    public void testBracketSelection_2026_OneCent_SelectsBracket0() {
        // 2026: Vehicle value 1 cent should select bracket 0
        Long vehicleValueCents = 1L; // 1 cent
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2026, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(0, bracket.get().getBracketIndex(), "1 cent should select bracket 0");
    }

    // ==================== 2027 Boundary Tests ====================

    @Test
    public void testBracketSelection_2027_ExactBoundary_R115000_SelectsBracket0() {
        // 2027: Vehicle value exactly R115,000 should select bracket 0 (≤ R115,000)
        Long vehicleValueCents = 11500000L; // R115,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(0, bracket.get().getBracketIndex(), "R115,000 should select bracket 0");
    }

    @Test
    public void testBracketSelection_2027_BoundaryPlusOne_R115001_SelectsBracket1() {
        // 2027: Vehicle value R115,000.01 should select bracket 1 (>R115,000–230,000)
        Long vehicleValueCents = 11500001L; // R115,000.01 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(1, bracket.get().getBracketIndex(), "R115,000.01 should select bracket 1");
    }

    @Test
    public void testBracketSelection_2027_ExactBoundary_R230000_SelectsBracket1() {
        // 2027: Vehicle value exactly R230,000 should select bracket 1 (>R115,000–230,000)
        Long vehicleValueCents = 23000000L; // R230,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(1, bracket.get().getBracketIndex(), "R230,000 should select bracket 1");
    }

    @Test
    public void testBracketSelection_2027_BoundaryPlusOne_R230001_SelectsBracket2() {
        // 2027: Vehicle value R230,000.01 should select bracket 2 (>R230,000–345,000)
        Long vehicleValueCents = 23000001L; // R230,000.01 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(2, bracket.get().getBracketIndex(), "R230,000.01 should select bracket 2");
    }

    @Test
    public void testBracketSelection_2027_TopBracketBoundary_R920000_SelectsBracket7() {
        // 2027: Vehicle value exactly R920,000 should select bracket 7 (>R805,000–920,000)
        Long vehicleValueCents = 92000000L; // R920,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(7, bracket.get().getBracketIndex(), "R920,000 should select bracket 7");
    }

    @Test
    public void testBracketSelection_2027_TopBracketBoundaryPlusOne_R920001_SelectsBracket8() {
        // 2027: Vehicle value R920,000.01 should select bracket 8 (>R920,000, open-ended)
        Long vehicleValueCents = 92000001L; // R920,000.01 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(8, bracket.get().getBracketIndex(), "R920,000.01 should select bracket 8");
    }

    @Test
    public void testBracketSelection_2027_VeryHighValue_R1000000_SelectsBracket8() {
        // 2027: Vehicle value R1,000,000 should select bracket 8 (open-ended)
        Long vehicleValueCents = 100000000L; // R1,000,000 in cents
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(8, bracket.get().getBracketIndex(), "R1,000,000 should select bracket 8");
    }

    @Test
    public void testBracketSelection_2027_OneCent_SelectsBracket0() {
        // 2027: Vehicle value 1 cent should select bracket 0
        Long vehicleValueCents = 1L; // 1 cent
        Optional<SarsCostScaleBracket> bracket = repository.findByTaxYearAndVehicleValue(2027, vehicleValueCents);
        
        assertTrue(bracket.isPresent(), "Bracket should be found");
        assertEquals(0, bracket.get().getBracketIndex(), "1 cent should select bracket 0");
    }
}
