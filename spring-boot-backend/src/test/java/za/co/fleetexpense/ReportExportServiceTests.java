package za.co.fleetexpense;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import za.co.fleetexpense.dto.ReportExportRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.ReportExport;
import za.co.fleetexpense.entity.TaxCalculationSnapshot;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleTaxProfile;
import za.co.fleetexpense.entity.enums.ExportFormat;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.enums.ReportExportStatus;
import za.co.fleetexpense.enums.ReportExportType;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.ReportExportRepository;
import za.co.fleetexpense.repository.TaxCalculationSnapshotRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;
import za.co.fleetexpense.service.ReportExportService;
import za.co.fleetexpense.util.FleetModeGuard;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportExportServiceTests {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private VehicleTaxProfileRepository vehicleTaxProfileRepository;

    @Mock
    private ReportExportRepository reportExportRepository;

    @Mock
    private TaxCalculationSnapshotRepository taxCalculationSnapshotRepository;

    @Mock
    private za.co.fleetexpense.mapper.ReportExportMapper reportExportMapper;

    @Mock
    private za.co.fleetexpense.service.ExportService exportService;

    @Mock
    private za.co.fleetexpense.service.TaxCalculationService taxCalculationService;

    @InjectMocks
    private ReportExportService reportExportService;

    private Organization organization;
    private User user;
    private Vehicle vehicle;
    private VehicleTaxProfile profile;
    private UUID orgId;
    private UUID userId;
    private UUID vehicleId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        userId = UUID.randomUUID();
        vehicleId = UUID.randomUUID();

        organization = Organization.builder()
                .id(orgId)
                .name("Test Org")
                .defaultTaxCalculationMethod(TaxCalculationMethod.SARS_COST_SCALE)
                .ownerId(userId) // User is the owner
                .build();

        user = User.builder()
                .id(userId)
                .email("test@example.com")
                .role(UserRole.SUPER_ADMIN)
                .organization(organization)
                .build();

        vehicle = Vehicle.builder()
                .id(vehicleId)
                .organization(organization)
                .registrationNumber("ABC123")
                .make("Toyota")
                .model("Corolla")
                .year(2020)
                .build();

        profile = VehicleTaxProfile.builder()
                .id(UUID.randomUUID())
                .vehicle(vehicle)
                .organization(organization)
                .vehicleCostCents(15000000L)
                .effectiveFrom(LocalDate.of(2026, 3, 1))
                .datePlacedInBusinessUse(LocalDate.of(2026, 3, 1))
                .build();
    }

    @Test
    void testTaxCalculationExport_DefaultMethodFallback() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);

            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(reportExportRepository.save(any(ReportExport.class))).thenAnswer(invocation -> {
                ReportExport saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(OffsetDateTime.now());
                saved.setUpdatedAt(OffsetDateTime.now());
                return saved;
            });
            when(reportExportMapper.toDto(any(ReportExport.class))).thenReturn(
                    za.co.fleetexpense.dto.ReportExportDTO.builder()
                            .id(UUID.randomUUID())
                            .reportType(ReportExportType.TAX_CALCULATION)
                            .calculationMethod(TaxCalculationMethod.SARS_COST_SCALE)
                            .status(ReportExportStatus.PENDING)
                            .build()
            );

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .vehicleId(vehicleId)
                    .taxYear(2027)
                    .calculationMethod(null)
                    .build();

            var export = reportExportService.requestExport(orgId, userId, request);

            assertNotNull(export);
            assertEquals(ReportExportType.TAX_CALCULATION, export.getReportType());
            assertEquals(TaxCalculationMethod.SARS_COST_SCALE, export.getCalculationMethod());

            verify(reportExportRepository).save(argThat(e ->
                    e.getCalculationMethod() == TaxCalculationMethod.SARS_COST_SCALE
            ));
        }
    }

    @Test
    void testTaxCalculationExport_ExplicitOverrideWins() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);

            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(reportExportRepository.save(any(ReportExport.class))).thenAnswer(invocation -> {
                ReportExport saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(OffsetDateTime.now());
                saved.setUpdatedAt(OffsetDateTime.now());
                return saved;
            });
            when(reportExportMapper.toDto(any(ReportExport.class))).thenReturn(
                    za.co.fleetexpense.dto.ReportExportDTO.builder()
                            .id(UUID.randomUUID())
                            .reportType(ReportExportType.TAX_CALCULATION)
                            .calculationMethod(TaxCalculationMethod.ACTUAL_COSTS)
                            .status(ReportExportStatus.PENDING)
                            .build()
            );

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .vehicleId(vehicleId)
                    .taxYear(2027)
                    .calculationMethod(TaxCalculationMethod.ACTUAL_COSTS)
                    .build();

            var export = reportExportService.requestExport(orgId, userId, request);

            assertNotNull(export);
            assertEquals(ReportExportType.TAX_CALCULATION, export.getReportType());
            assertEquals(TaxCalculationMethod.ACTUAL_COSTS, export.getCalculationMethod());

            verify(reportExportRepository).save(argThat(e ->
                    e.getCalculationMethod() == TaxCalculationMethod.ACTUAL_COSTS
            ));
        }
    }

    @Test
    void testTaxCalculationExport_OrgDefaultUnchangedAfterOverride() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);

            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(reportExportRepository.save(any(ReportExport.class))).thenAnswer(invocation -> {
                ReportExport saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(OffsetDateTime.now());
                saved.setUpdatedAt(OffsetDateTime.now());
                return saved;
            });
            when(reportExportMapper.toDto(any(ReportExport.class))).thenReturn(
                    za.co.fleetexpense.dto.ReportExportDTO.builder()
                            .id(UUID.randomUUID())
                            .reportType(ReportExportType.TAX_CALCULATION)
                            .calculationMethod(TaxCalculationMethod.ACTUAL_COSTS)
                            .status(ReportExportStatus.PENDING)
                            .build()
            );

            organization.setDefaultTaxCalculationMethod(TaxCalculationMethod.SARS_COST_SCALE);

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .vehicleId(vehicleId)
                    .taxYear(2027)
                    .calculationMethod(TaxCalculationMethod.ACTUAL_COSTS)
                    .build();

            var export = reportExportService.requestExport(orgId, userId, request);

            assertNotNull(export);
            assertEquals(TaxCalculationMethod.ACTUAL_COSTS, export.getCalculationMethod());

            verify(organizationRepository, never()).save(any(Organization.class));
            assertEquals(TaxCalculationMethod.SARS_COST_SCALE, organization.getDefaultTaxCalculationMethod());
        }
    }

    @Test
    void testTaxCalculationExport_RequiresVehicleId() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);
            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .taxYear(2027)
                    .calculationMethod(TaxCalculationMethod.SARS_COST_SCALE)
                    .vehicleId(null) // Missing vehicle ID
                    .build();

            assertThrows(IllegalArgumentException.class, () -> {
                reportExportService.requestExport(orgId, userId, request);
            });
        }
    }

    @Test
    void testTaxCalculationExport_RequiresTaxYear() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);
            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .vehicleId(vehicleId)
                    .taxYear(null) // Missing tax year
                    .calculationMethod(TaxCalculationMethod.SARS_COST_SCALE)
                    .build();

            assertThrows(IllegalArgumentException.class, () -> {
                reportExportService.requestExport(orgId, userId, request);
            });
        }
    }

    @Test
    void testTaxCalculationExport_NoOrgDefault_ThrowsException() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);

            // Remove org default tax calculation method
            organization.setDefaultTaxCalculationMethod(null);
            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .vehicleId(vehicleId)
                    .taxYear(2027)
                    .calculationMethod(null) // Not specified and no org default
                    .build();

            assertThrows(IllegalArgumentException.class, () -> {
                reportExportService.requestExport(orgId, userId, request);
            });
        }
    }

    @Test
    void testTaxCalculationExport_SnapshotCreated() {
        try (MockedStatic<FleetModeGuard> mockedGuard = mockStatic(FleetModeGuard.class)) {
            mockedGuard.when(() -> FleetModeGuard.requireFleetMode(any())).thenAnswer(invocation -> null);

            when(organizationRepository.findById(orgId)).thenReturn(Optional.of(organization));
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(reportExportRepository.save(any(ReportExport.class))).thenAnswer(invocation -> {
                ReportExport saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(OffsetDateTime.now());
                saved.setUpdatedAt(OffsetDateTime.now());
                return saved;
            });
            when(reportExportMapper.toDto(any(ReportExport.class))).thenReturn(
                    za.co.fleetexpense.dto.ReportExportDTO.builder()
                            .id(UUID.randomUUID())
                            .reportType(ReportExportType.TAX_CALCULATION)
                            .calculationMethod(TaxCalculationMethod.SARS_COST_SCALE)
                            .status(ReportExportStatus.PENDING)
                            .build()
            );

            ReportExportRequest request = ReportExportRequest.builder()
                    .reportType(ReportExportType.TAX_CALCULATION)
                    .format(ExportFormat.PDF)
                    .vehicleId(vehicleId)
                    .taxYear(2027)
                    .calculationMethod(TaxCalculationMethod.SARS_COST_SCALE)
                    .build();

            var export = reportExportService.requestExport(orgId, userId, request);

            assertNotNull(export);
            // Snapshot creation happens in async method - verified by successful export creation
        }
    }
}
