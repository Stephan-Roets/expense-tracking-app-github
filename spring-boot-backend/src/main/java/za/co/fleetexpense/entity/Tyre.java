package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "tyres")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tyre {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false, unique = true)
    private Expense expense;

    @Column(nullable = false)
    private String brand;

    private String model;

    @Column(nullable = false)
    private String size;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    private String position;

    @Column(name = "purchase_odometer", nullable = false)
    private Integer purchaseOdometer;

    @Column(name = "tread_depth_mm", precision = 4, scale = 1)
    private BigDecimal treadDepthMm;

    @Column(name = "expected_lifespan_km")
    private Integer expectedLifespanKm;

    @Column(name = "rotation_interval_km", nullable = false)
    @Builder.Default
    private Integer rotationIntervalKm = 8000;

    @Column(name = "last_rotation_odometer")
    private Integer lastRotationOdometer;

    @Column(name = "warranty_km")
    private Integer warrantyKm;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
