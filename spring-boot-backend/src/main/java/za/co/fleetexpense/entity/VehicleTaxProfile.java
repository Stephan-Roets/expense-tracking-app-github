package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import za.co.fleetexpense.entity.enums.CompensationType;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;
import za.co.fleetexpense.entity.enums.TaxpayerType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicle_tax_profiles", indexes = {
    @Index(name = "idx_vehicle_tax_profiles_organization", columnList = "organization_id"),
    @Index(name = "idx_vehicle_tax_profiles_vehicle", columnList = "vehicle_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VehicleTaxProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(name = "vehicle_cost_cents", nullable = false)
    private Long vehicleCostCents;

    @Column(name = "date_placed_in_business_use", nullable = false)
    private LocalDate datePlacedInBusinessUse;

    @Column(name = "taxpayer_vat_registered", nullable = false)
    @Builder.Default
    private Boolean taxpayerVatRegistered = false;

    @Column(name = "taxpayer_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private TaxpayerType taxpayerType;

    @Column(name = "compensation_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private CompensationType compensationType;

    @Column(name = "fuel_borne_by", nullable = false)
    private String fuelBorneBy; // "EMPLOYER", "EMPLOYEE"

    @Column(name = "maintenance_borne_by", nullable = false)
    private String maintenanceBorneBy; // "EMPLOYER", "EMPLOYEE"

    @Column(name = "covered_by_maintenance_plan", nullable = false)
    @Builder.Default
    private Boolean coveredByMaintenancePlan = false;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_calculation_method")
    private TaxCalculationMethod defaultCalculationMethod;

    @Column(name = "is_company_provided_vehicle")
    @Builder.Default
    private Boolean isCompanyProvidedVehicle = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
