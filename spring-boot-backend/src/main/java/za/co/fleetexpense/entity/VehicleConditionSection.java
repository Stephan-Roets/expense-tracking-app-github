package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "vehicle_condition_section")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VehicleConditionSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private VehicleConditionReport report;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_type", nullable = false)
    private za.co.fleetexpense.entity.enums.SectionType sectionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition", nullable = false)
    private za.co.fleetexpense.entity.enums.Condition condition;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "locked", nullable = false)
    @Builder.Default
    private Boolean locked = false;

    @Column(name = "inspected_at", nullable = false)
    private OffsetDateTime inspectedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VehicleConditionImage> images = new ArrayList<>();
}
