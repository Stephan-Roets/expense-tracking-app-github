package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.MaintenanceItemType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "maintenance_topups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceTopup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false, unique = true)
    private Expense expense;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, columnDefinition = "maintenance_item_type")
    private MaintenanceItemType itemType;

    @Column(name = "item_brand")
    private String itemBrand;

    @Column(name = "item_quantity", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal itemQuantity = BigDecimal.ONE;

    @Column(name = "item_unit")
    private String itemUnit;

    @Column(name = "shop_name")
    private String shopName;

    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
