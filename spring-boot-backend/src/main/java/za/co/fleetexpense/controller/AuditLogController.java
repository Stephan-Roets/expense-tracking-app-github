package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.AuditLog;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.AuditLogService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAllAuditLogs(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(auditLogService.getByOrganization(principal.getOrganizationId()));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<AuditLog>> getRecentAuditLogs(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "7") int days) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        return ResponseEntity.ok(auditLogService.getRecentByOrganization(principal.getOrganizationId(), since));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLog>> getAuditLogsByEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        return ResponseEntity.ok(auditLogService.getByEntity(entityType, entityId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuditLog>> getAuditLogsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(auditLogService.getByUser(userId));
    }
}
