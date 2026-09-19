package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "address")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_profile_id", nullable = false, unique = true)
    private UserProfile userProfile;

    @Column(name = "recipient_full_name", nullable = false)
    private String recipientFullName;

    @Column(name = "street_number", nullable = false)
    private String streetNumber;

    @Column(name = "street_name", nullable = false)
    private String streetName;

    @Column(name = "flat_unit_number")
    private String flatUnitNumber;

    @Column(name = "building_name")
    private String buildingName;

    @Column(nullable = false)
    private String suburb;

    @Column(name = "city_town", nullable = false)
    private String cityTown;

    @Column(nullable = false)
    private String province;

    @Column(name = "postal_code", nullable = false)
    private String postalCode;

    @Column(nullable = false)
    private String country;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
