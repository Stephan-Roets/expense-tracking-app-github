package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.TaxCalculationMethod;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OrganizationMode mode = OrganizationMode.SOLO;

    @Column(name = "tax_number")
    private String taxNumber;

    @Column(name = "vat_number")
    private String vatNumber;

    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    private String city;

    private String province;

    @Column(name = "postal_code")
    private String postalCode;

    @Column(nullable = false)
    @Builder.Default
    private String country = "South Africa";

    private String phone;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "condition_report_enabled")
    @Builder.Default
    private Boolean conditionReportEnabled = true;

    @Column(name = "odometer_confirmation_enabled")
    @Builder.Default
    private Boolean odometerConfirmationEnabled = true;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_tax_calculation_method")
    private TaxCalculationMethod defaultTaxCalculationMethod;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
