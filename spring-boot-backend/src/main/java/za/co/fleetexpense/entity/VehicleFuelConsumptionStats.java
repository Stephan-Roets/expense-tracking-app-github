package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicle_fuel_consumption_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VehicleFuelConsumptionStats {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false, unique = true)
    private Vehicle vehicle;

    @Column(name = "total_fuel_logs", nullable = false)
    @Builder.Default
    private Integer totalFuelLogs = 0;

    @Column(name = "total_full_tank_fills", nullable = false)
    @Builder.Default
    private Integer totalFullTankFills = 0;

    @Column(name = "total_liters", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal totalLiters = BigDecimal.ZERO;

    @Column(name = "total_distance_km", nullable = false)
    @Builder.Default
    private Integer totalDistanceKm = 0;

    @Column(name = "total_fuel_cost_zar", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalFuelCostZar = BigDecimal.ZERO;

    @Column(name = "average_consumption_l_per_100km", precision = 6, scale = 2)
    private BigDecimal averageConsumptionLPer100km;

    @Column(name = "best_consumption_l_per_100km", precision = 6, scale = 2)
    private BigDecimal bestConsumptionLPer100km;

    @Column(name = "worst_consumption_l_per_100km", precision = 6, scale = 2)
    private BigDecimal worstConsumptionLPer100km;

    @Column(name = "recent_average_consumption_l_per_100km", precision = 6, scale = 2)
    private BigDecimal recentAverageConsumptionLPer100km;

    @Column(name = "last_fill_odometer")
    private Integer lastFillOdometer;

    @Column(name = "last_fill_date")
    private LocalDate lastFillDate;

    @Column(name = "last_fill_full_tank")
    private Boolean lastFillFullTank;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
