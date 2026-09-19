package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.CarWashType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "car_washes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarWash {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false, unique = true)
    private Expense expense;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "wash_type", nullable = false, columnDefinition = "car_wash_type")
    private CarWashType washType;

    @Column(name = "wash_name")
    private String washName;

    @Column(name = "wash_location")
    private String washLocation;

    @Column(name = "interior_cleaned")
    @Builder.Default
    private Boolean interiorCleaned = false;

    @Column(name = "exterior_cleaned")
    @Builder.Default
    private Boolean exteriorCleaned = true;

    @Column(name = "engine_cleaned")
    @Builder.Default
    private Boolean engineCleaned = false;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
