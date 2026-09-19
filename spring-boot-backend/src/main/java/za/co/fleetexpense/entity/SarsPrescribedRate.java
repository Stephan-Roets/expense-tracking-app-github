package za.co.fleetexpense.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * SARS Prescribed Rate entity for Phase 2 tax calculation.
 * Simplified reimbursement rate per kilometre for each tax year.
 * Source: SARS gazetted notices for each tax year.
 */
@Entity
@Table(name = "sars_prescribed_rates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SarsPrescribedRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer taxYear;

    @Column(nullable = false)
    private Long rateCentsPerKm; // Stored as cents per km

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
