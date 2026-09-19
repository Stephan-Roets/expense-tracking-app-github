package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.FuelType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "fuel_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expense_id", nullable = false, unique = true)
    private Expense expense;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Column(nullable = false, precision = 8, scale = 3)
    private BigDecimal liters;

    @Column(name = "price_per_liter", nullable = false, precision = 8, scale = 4)
    private BigDecimal pricePerLiter;

    @Column(name = "full_tank")
    @Builder.Default
    private Boolean fullTank = false;

    @Column(name = "station_name")
    private String stationName;

    @Column(name = "station_location")
    private String stationLocation;

    @Column(name = "previous_odometer")
    private Integer previousOdometer;

    @Column(name = "km_since_last_fill")
    private Integer kmSinceLastFill;

    @Column(name = "efficiency_km_per_liter", precision = 6, scale = 2)
    private BigDecimal efficiencyKmPerLiter;

    @Column(name = "consumption_l_per_100km", precision = 6, scale = 2)
    private BigDecimal consumptionLPer100km;

    @Column(name = "is_baseline_fill")
    @Builder.Default
    private Boolean isBaselineFill = false;

    @Column(name = "consumption_calculated_at")
    private OffsetDateTime consumptionCalculatedAt;

    @Column(name = "consumption_notes")
    private String consumptionNotes;

    // GPS coordinates for fuel purchase location (optional)
    @Column(name = "gps_latitude", precision = 10, scale = 8)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", precision = 11, scale = 8)
    private BigDecimal gpsLongitude;

    @Column(name = "gps_accuracy_meters", precision = 8, scale = 2)
    private BigDecimal gpsAccuracyMeters;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
