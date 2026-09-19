package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.ServiceType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "mechanic_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MechanicService {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false, unique = true)
    private Expense expense;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, columnDefinition = "service_type")
    private ServiceType serviceType;

    @Column(name = "workshop_name", nullable = false)
    private String workshopName;

    @Column(name = "workshop_phone")
    private String workshopPhone;

    @Column(name = "workshop_address")
    private String workshopAddress;

    @Column(name = "technician_name")
    private String technicianName;

    @Column(name = "labor_cost_zar", precision = 12, scale = 2)
    private BigDecimal laborCostZar;

    @Column(name = "parts_cost_zar", precision = 12, scale = 2)
    private BigDecimal partsCostZar;

    @Column(name = "work_description")
    private String workDescription;

    @Column(name = "parts_replaced")
    private String partsReplaced;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "next_service_due_km")
    private Integer nextServiceDueKm;

    @Column(name = "next_service_due_date")
    private LocalDate nextServiceDueDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
