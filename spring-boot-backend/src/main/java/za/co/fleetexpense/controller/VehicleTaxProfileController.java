package za.co.fleetexpense.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.TaxCalculationRequest;
import za.co.fleetexpense.dto.TaxCalculationResult;
import za.co.fleetexpense.dto.VehicleTaxProfileCreateRequest;
import za.co.fleetexpense.dto.VehicleTaxProfileDTO;
import za.co.fleetexpense.dto.VehicleTaxProfileUpdateRequest;
import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.VehicleTaxProfile;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.TaxCalculationService;
import za.co.fleetexpense.service.TaxYearSummaryService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/vehicles/{vehicleId}/tax-profiles")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class VehicleTaxProfileController {

    private final VehicleTaxProfileRepository vehicleTaxProfileRepository;
    private final VehicleRepository vehicleRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final TaxCalculationService taxCalculationService;
    private final TaxYearSummaryService taxYearSummaryService;

    @GetMapping
    public ResponseEntity<List<VehicleTaxProfileDTO>> getTaxProfiles(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Verify vehicle belongs to user's organization
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        if (!vehicle.getOrganization().getId().equals(principal.getOrganizationId())) {
            return ResponseEntity.status(403).build();
        }

        List<VehicleTaxProfile> profiles = vehicleTaxProfileRepository.findByVehicleId(vehicleId);
        return ResponseEntity.ok(profiles.stream()
                .map(this::toDTO)
                .collect(Collectors.toList()));
    }

    @GetMapping("/active")
    public ResponseEntity<VehicleTaxProfileDTO> getActiveTaxProfile(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Verify vehicle belongs to user's organization
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        if (!vehicle.getOrganization().getId().equals(principal.getOrganizationId())) {
            return ResponseEntity.status(403).build();
        }

        return vehicleTaxProfileRepository.findByVehicleIdAndEffectiveToIsNull(vehicleId)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<VehicleTaxProfileDTO> createTaxProfile(
            @PathVariable UUID vehicleId,
            @Valid @RequestBody VehicleTaxProfileCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Verify vehicle belongs to user's organization
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        if (!vehicle.getOrganization().getId().equals(principal.getOrganizationId())) {
            return ResponseEntity.status(403).build();
        }

        // Owner-access enforcement: only org owner or assigned driver can edit (in addition to admins/managers)
        if (!isUserAuthorizedForVehicle(vehicle, principal)) {
            return ResponseEntity.status(403).build();
        }

        // Overlap protection: close any existing active profile for this vehicle
        vehicleTaxProfileRepository.findByVehicleIdAndEffectiveToIsNull(vehicleId)
                .ifPresent(existingProfile -> {
                    existingProfile.setEffectiveTo(request.getEffectiveFrom());
                    vehicleTaxProfileRepository.save(existingProfile);
                });

        Organization organization = organizationRepository.findById(principal.getOrganizationId())
                .orElseThrow(() -> new RuntimeException("Organization not found"));

        User createdBy = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        VehicleTaxProfile profile = VehicleTaxProfile.builder()
                .organization(organization)
                .vehicle(vehicle)
                .vehicleCostCents(request.getVehicleCostCents())
                .datePlacedInBusinessUse(request.getDatePlacedInBusinessUse())
                .taxpayerVatRegistered(request.getTaxpayerVatRegistered())
                .taxpayerType(request.getTaxpayerType())
                .compensationType(request.getCompensationType())
                .fuelBorneBy(request.getFuelBorneBy())
                .maintenanceBorneBy(request.getMaintenanceBorneBy())
                .coveredByMaintenancePlan(request.getCoveredByMaintenancePlan())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .defaultCalculationMethod(request.getDefaultCalculationMethod())
                .isCompanyProvidedVehicle(request.getIsCompanyProvidedVehicle() != null ? request.getIsCompanyProvidedVehicle() : false)
                .createdBy(createdBy)
                .build();

        VehicleTaxProfile saved = vehicleTaxProfileRepository.save(profile);
        return ResponseEntity.ok(toDTO(saved));
    }

    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<VehicleTaxProfileDTO> updateTaxProfile(
            @PathVariable UUID vehicleId,
            @PathVariable UUID id,
            @Valid @RequestBody VehicleTaxProfileUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Verify vehicle belongs to user's organization
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        if (!vehicle.getOrganization().getId().equals(principal.getOrganizationId())) {
            return ResponseEntity.status(403).build();
        }

        // Owner-access enforcement: only org owner or assigned driver can edit (in addition to admins/managers)
        if (!isUserAuthorizedForVehicle(vehicle, principal)) {
            return ResponseEntity.status(403).build();
        }

        return vehicleTaxProfileRepository.findById(id)
                .filter(profile -> profile.getVehicle().getId().equals(vehicleId))
                .map(profile -> {
                    if (request.getVehicleCostCents() != null) {
                        profile.setVehicleCostCents(request.getVehicleCostCents());
                    }
                    if (request.getDatePlacedInBusinessUse() != null) {
                        profile.setDatePlacedInBusinessUse(request.getDatePlacedInBusinessUse());
                    }
                    if (request.getTaxpayerVatRegistered() != null) {
                        profile.setTaxpayerVatRegistered(request.getTaxpayerVatRegistered());
                    }
                    if (request.getTaxpayerType() != null) {
                        profile.setTaxpayerType(request.getTaxpayerType());
                    }
                    if (request.getCompensationType() != null) {
                        profile.setCompensationType(request.getCompensationType());
                    }
                    if (request.getFuelBorneBy() != null) {
                        profile.setFuelBorneBy(request.getFuelBorneBy());
                    }
                    if (request.getMaintenanceBorneBy() != null) {
                        profile.setMaintenanceBorneBy(request.getMaintenanceBorneBy());
                    }
                    if (request.getCoveredByMaintenancePlan() != null) {
                        profile.setCoveredByMaintenancePlan(request.getCoveredByMaintenancePlan());
                    }
                    if (request.getEffectiveFrom() != null) {
                        profile.setEffectiveFrom(request.getEffectiveFrom());
                    }
                    if (request.getEffectiveTo() != null) {
                        profile.setEffectiveTo(request.getEffectiveTo());
                    }
                    if (request.getDefaultCalculationMethod() != null) {
                        profile.setDefaultCalculationMethod(request.getDefaultCalculationMethod());
                    }
                    if (request.getIsCompanyProvidedVehicle() != null) {
                        profile.setIsCompanyProvidedVehicle(request.getIsCompanyProvidedVehicle());
                    }
                    return ResponseEntity.ok(toDTO(vehicleTaxProfileRepository.save(profile)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTaxProfile(
            @PathVariable UUID vehicleId,
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Verify vehicle belongs to user's organization
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        if (!vehicle.getOrganization().getId().equals(principal.getOrganizationId())) {
            return ResponseEntity.status(403).build();
        }

        if (vehicleTaxProfileRepository.existsById(id)) {
            vehicleTaxProfileRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/tax-calculations")
    public ResponseEntity<Map<String, Object>> calculateTaxComparison(
            @PathVariable UUID vehicleId,
            @RequestParam Integer taxYear,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Verify vehicle belongs to user's organization
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        
        if (!vehicle.getOrganization().getId().equals(principal.getOrganizationId())) {
            return ResponseEntity.status(403).build();
        }

        // Owner-access enforcement: only org owner or assigned driver can access
        if (!isUserAuthorizedForVehicle(vehicle, principal)) {
            return ResponseEntity.status(403).build();
        }

        // Resolve tax profile server-side for the given tax year
        VehicleTaxProfile profile = taxCalculationService.findProfileForTaxYear(vehicleId, taxYear);
        
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        // Get km and classified expense totals server-side from TaxYearSummaryService
        za.co.fleetexpense.dto.TaxYearSummaryDTO taxYearSummary = taxYearSummaryService.getByVehicleAndYear(vehicleId, taxYear);
        
        if (taxYearSummary == null) {
            return ResponseEntity.notFound().build();
        }

        // Extract data from TaxYearSummaryService (includes data-quality warnings)
        BigDecimal businessKm = BigDecimal.valueOf(taxYearSummary.getBusinessKm() != null ? taxYearSummary.getBusinessKm() : 0L);
        BigDecimal totalKm = BigDecimal.valueOf(taxYearSummary.getTotalKm() != null ? taxYearSummary.getTotalKm() : 0L);
        BigDecimal qualifyingCurrentExpenseCents = BigDecimal.valueOf(taxYearSummary.getQualifyingCurrentExpenseCents() != null ? taxYearSummary.getQualifyingCurrentExpenseCents() : 0L);
        List<String> dataQualityWarnings = taxYearSummary.getDataQualityWarnings();

        // Calculate tax year boundaries
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, 3, 1);
        LocalDate taxYearEndExcl = LocalDate.of(taxYear, 3, 1);
        LocalDate taxYearEnd = taxYearEndExcl.minusDays(1);  // Feb 28 or 29, leap-aware

        // Calculate using all three methods, applying eligibility gating
        TaxCalculationResult actualCostsResult;
        if (taxCalculationService.isEligibleForMethod(
                za.co.fleetexpense.entity.enums.TaxCalculationMethod.ACTUAL_COSTS,
                profile,
                businessKm,
                totalKm)) {
            actualCostsResult = taxCalculationService.calculateActualCosts(
                    profile,
                    qualifyingCurrentExpenseCents,
                    businessKm,
                    totalKm,
                    taxYearStart,
                    taxYearEnd
            );
        } else {
            actualCostsResult = TaxCalculationResult.builder()
                    .method("ACTUAL_COSTS")
                    .eligible(false)
                    .ineligibilityReason(taxCalculationService.getIneligibilityReason(
                            za.co.fleetexpense.entity.enums.TaxCalculationMethod.ACTUAL_COSTS,
                            profile))
                    .build();
        }

        TaxCalculationResult sarsCostScaleResult;
        if (taxCalculationService.isEligibleForMethod(
                za.co.fleetexpense.entity.enums.TaxCalculationMethod.SARS_COST_SCALE,
                profile,
                businessKm,
                totalKm)) {
            sarsCostScaleResult = taxCalculationService.calculateSarsCostScale(
                    profile,
                    taxYearStart,
                    taxYearEnd,
                    businessKm,
                    totalKm
            );
        } else {
            sarsCostScaleResult = TaxCalculationResult.builder()
                    .method("SARS_COST_SCALE")
                    .eligible(false)
                    .ineligibilityReason(taxCalculationService.getIneligibilityReason(
                            za.co.fleetexpense.entity.enums.TaxCalculationMethod.SARS_COST_SCALE,
                            profile))
                    .build();
        }

        TaxCalculationResult simplifiedReimbursiveResult;
        if (taxCalculationService.isEligibleForMethod(
                za.co.fleetexpense.entity.enums.TaxCalculationMethod.SIMPLIFIED_REIMBURSIVE,
                profile,
                businessKm,
                totalKm)) {
            simplifiedReimbursiveResult = taxCalculationService.calculateSimplifiedReimbursive(
                    profile,
                    taxYearStart,
                    taxYearEnd,
                    businessKm
            );
        } else {
            simplifiedReimbursiveResult = TaxCalculationResult.builder()
                    .method("SIMPLIFIED_REIMBURSIVE")
                    .eligible(false)
                    .ineligibilityReason(taxCalculationService.getIneligibilityReason(
                            za.co.fleetexpense.entity.enums.TaxCalculationMethod.SIMPLIFIED_REIMBURSIVE,
                            profile))
                    .build();
        }

        Map<String, TaxCalculationResult> results = new HashMap<>();
        results.put("actualCosts", actualCostsResult);
        results.put("sarsCostScale", sarsCostScaleResult);
        results.put("simplifiedReimbursement", simplifiedReimbursiveResult);

        // Include data quality warnings in response
        Map<String, Object> response = new HashMap<>();
        response.put("results", results);
        response.put("dataQualityWarnings", dataQualityWarnings);

        return ResponseEntity.ok(response);
    }

    private VehicleTaxProfileDTO toDTO(VehicleTaxProfile profile) {
        return VehicleTaxProfileDTO.builder()
                .id(profile.getId())
                .organizationId(profile.getOrganization().getId())
                .vehicleId(profile.getVehicle().getId())
                .vehicleRegistration(profile.getVehicle().getRegistrationNumber())
                .vehicleMake(profile.getVehicle().getMake())
                .vehicleModel(profile.getVehicle().getModel())
                .vehicleCostCents(profile.getVehicleCostCents())
                .datePlacedInBusinessUse(profile.getDatePlacedInBusinessUse())
                .taxpayerVatRegistered(profile.getTaxpayerVatRegistered())
                .taxpayerType(profile.getTaxpayerType())
                .compensationType(profile.getCompensationType())
                .fuelBorneBy(profile.getFuelBorneBy())
                .maintenanceBorneBy(profile.getMaintenanceBorneBy())
                .coveredByMaintenancePlan(profile.getCoveredByMaintenancePlan())
                .effectiveFrom(profile.getEffectiveFrom())
                .effectiveTo(profile.getEffectiveTo())
                .defaultCalculationMethod(profile.getDefaultCalculationMethod())
                .isCompanyProvidedVehicle(profile.getIsCompanyProvidedVehicle())
                .createdBy(profile.getCreatedBy() != null ? profile.getCreatedBy().getId() : null)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }

    /**
     * Owner-access enforcement helper.
     * Returns true if user is authorized to edit the vehicle's tax profile.
     * Authorization is granted if:
     * - User is the organization owner, OR
     * - User is the assigned driver of the vehicle, OR
     * - User has SUPER_ADMIN, ADMIN, or MANAGER role (handled by @PreAuthorize)
     */
    private boolean isUserAuthorizedForVehicle(Vehicle vehicle, UserPrincipal principal) {
        // Check if user is organization owner
        if (vehicle.getOrganization().getOwnerId() != null && 
            vehicle.getOrganization().getOwnerId().equals(principal.getUserId())) {
            return true;
        }
        
        // Check if user is assigned driver of the vehicle
        if (vehicle.getAssignedDriver() != null && 
            vehicle.getAssignedDriver().getId().equals(principal.getUserId())) {
            return true;
        }
        
        return false;
    }
}
