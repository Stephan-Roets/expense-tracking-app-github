package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.AuditLog;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findByOrganizationId(UUID organizationId);

    List<AuditLog> findByUserId(UUID userId);

    @Query("SELECT al FROM AuditLog al WHERE al.entityType = :entityType AND al.entityId = :entityId")
    List<AuditLog> findByEntity(@Param("entityType") String entityType, @Param("entityId") UUID entityId);

    @Query("SELECT al FROM AuditLog al WHERE al.organization.id = :orgId AND al.createdAt >= :since ORDER BY al.createdAt DESC")
    List<AuditLog> findRecentByOrganization(@Param("orgId") UUID orgId, @Param("since") OffsetDateTime since);
}
