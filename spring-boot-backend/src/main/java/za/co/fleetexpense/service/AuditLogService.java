package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.AuditLog;
import za.co.fleetexpense.repository.AuditLogRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public List<AuditLog> getByOrganization(UUID organizationId) {
        return auditLogRepository.findByOrganizationId(organizationId);
    }

    public List<AuditLog> getRecentByOrganization(UUID organizationId, OffsetDateTime since) {
        return auditLogRepository.findRecentByOrganization(organizationId, since);
    }

    public List<AuditLog> getByEntity(String entityType, UUID entityId) {
        return auditLogRepository.findByEntity(entityType, entityId);
    }

    public List<AuditLog> getByUser(UUID userId) {
        return auditLogRepository.findByUserId(userId);
    }

    @Transactional
    public void logAction(UUID organizationId, UUID userId, String action, String entityType,
                          UUID entityId, Map<String, Object> oldValues, Map<String, Object> newValues,
                          String ipAddress, String userAgent) {
        AuditLog auditLog = AuditLog.builder()
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValues(oldValues)
                .newValues(newValues)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();

        AuditLog saved = auditLogRepository.save(auditLog);
        log.debug("Logged audit action {} on {} {}", action, entityType, entityId);
    }

    @Transactional
    public void logCreate(UUID organizationId, UUID userId, String entityType, UUID entityId,
                          Map<String, Object> newValues, String ipAddress, String userAgent) {
        logAction(organizationId, userId, "CREATE", entityType, entityId, null, newValues, ipAddress, userAgent);
    }

    @Transactional
    public void logUpdate(UUID organizationId, UUID userId, String entityType, UUID entityId,
                          Map<String, Object> oldValues, Map<String, Object> newValues,
                          String ipAddress, String userAgent) {
        logAction(organizationId, userId, "UPDATE", entityType, entityId, oldValues, newValues, ipAddress, userAgent);
    }

    @Transactional
    public void logDelete(UUID organizationId, UUID userId, String entityType, UUID entityId,
                          Map<String, Object> oldValues, String ipAddress, String userAgent) {
        logAction(organizationId, userId, "DELETE", entityType, entityId, oldValues, null, ipAddress, userAgent);
    }
}
