package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import za.co.fleetexpense.entity.enums.TripPurpose;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "recurring_trips", indexes = {
    @Index(name = "idx_recurring_trips_organization", columnList = "organization_id"),
    @Index(name = "idx_recurring_trips_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_recurring_trips_user", columnList = "user_id"),
    @Index(name = "idx_recurring_trips_active", columnList = "is_active,is_recurring")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurringTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Trip details
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false)
    private TripPurpose purpose;

    @Column(name = "start_location", nullable = false)
    private String startLocation;

    @Column(name = "end_location", nullable = false)
    private String endLocation;

    @Column(name = "route_description")
    private String routeDescription;

    @Column(name = "customer_client_name")
    private String customerClientName;

    @Column(name = "reason_for_trip")
    private String reasonForTrip;

    // Time settings for sorting
    @Column(name = "start_time")
    private String startTime; // HH:mm format

    @Column(name = "end_time")
    private String endTime; // HH:mm format

    // Recurrence settings
    @Column(name = "is_recurring", nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;

    @Column(name = "recurrence_days")
    private String recurrenceDays; // Comma-separated: MON,TUE,WED,THU,FRI,SAT,SUN

    @Column(name = "recurrence_days_of_month")
    private String recurrenceDaysOfMonth; // Comma-separated: 1,15,30

    @Column(name = "recurrence_start_date", nullable = false)
    private LocalDate recurrenceStartDate;

    @Column(name = "recurrence_end_date")
    private LocalDate recurrenceEndDate; // NULL for ongoing

    // Default costs
    @Column(name = "default_toll_costs_zar", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal defaultTollCostsZar = BigDecimal.ZERO;

    @Column(name = "default_parking_costs_zar", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal defaultParkingCostsZar = BigDecimal.ZERO;

    // Metadata
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
