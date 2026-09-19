package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * SARS Cost Scale Bracket entity for Phase 2 tax calculation.
 * Bracket selection is by vehicle value, not annual kilometres.
 * Source: SARS gazetted notices for each tax year.
 */
@Entity
@Table(name = "sars_cost_scale_brackets", indexes = {
    @Index(name = "idx_sars_brackets_tax_year", columnList = "tax_year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SarsCostScaleBracket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer taxYear;

    @Column(nullable = false)
    private Integer bracketIndex;

    @Column(nullable = false)
    private Long minVehicleValueCents; // Stored as cents (R * 100)

    @Column
    private Long maxVehicleValueCents; // NULL for open-ended top bracket

    @Column(nullable = false)
    private Long fixedCostCents; // Stored as cents

    @Column(nullable = false)
    private Long fuelCostTenthsCentsPerKm; // Stored as tenths of cents per km (e.g., 1467 = 146.7c/km)

    @Column(nullable = false)
    private Long maintenanceCostTenthsCentsPerKm; // Stored as tenths of cents per km (e.g., 474 = 47.4c/km)

    @Column(nullable = false, length = 255)
    private String sourceName;

    @Column(nullable = false, length = 500)
    private String sourceUrl;

    @Column(nullable = false)
    private LocalDateTime publishedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
