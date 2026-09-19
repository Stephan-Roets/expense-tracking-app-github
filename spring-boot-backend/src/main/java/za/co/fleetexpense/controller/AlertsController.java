package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.ExpiryAlertDTO;
import za.co.fleetexpense.dto.TyreRotationRecordRequest;
import za.co.fleetexpense.dto.TyreRotationWarningDTO;
import za.co.fleetexpense.entity.ExpiryAlert;
import za.co.fleetexpense.entity.TyreRotationHistory;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.ExpiryAlertService;
import za.co.fleetexpense.service.TyreRotationService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/alerts")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@Slf4j
public class AlertsController {

    private final TyreRotationService tyreRotationService;
    private final ExpiryAlertService expiryAlertService;

    @GetMapping("/tyre-rotation")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TyreRotationWarningDTO>> getTyreRotationAlerts(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(tyreRotationService.getActiveWarnings(principal.getOrganizationId()));
    }

    @GetMapping("/expiry")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ExpiryAlertDTO>> getExpiryAlerts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "false") boolean includeDismissed) {
        if (principal == null) {
            return ResponseEntity.badRequest().build();
        }
        // For DRIVER role in FLEET mode, only show alerts for vehicles assigned to them
        // SOLO mode and ADMIN/MANAGER roles see all organization alerts
        if (principal.getRole() == za.co.fleetexpense.entity.enums.UserRole.DRIVER && (principal.getOrganizationMode() == za.co.fleetexpense.entity.enums.OrganizationMode.BUSINESS_FLEET || principal.getOrganizationMode() == za.co.fleetexpense.entity.enums.OrganizationMode.COMPANY)) {
            if (includeDismissed) {
                return ResponseEntity.ok(expiryAlertService.getByOrganizationAndDriver(principal.getOrganizationId(), principal.getUserId()));
            }
            return ResponseEntity.ok(expiryAlertService.getActiveAlertsByDriver(principal.getOrganizationId(), principal.getUserId()));
        }
        // For SOLO mode, ADMIN, and MANAGER, show all organization alerts
        if (includeDismissed) {
            return ResponseEntity.ok(expiryAlertService.getByOrganization(principal.getOrganizationId()));
        }
        return ResponseEntity.ok(expiryAlertService.getActiveAlerts(principal.getOrganizationId()));
    }

    @PostMapping("/tyre-rotation/{id}/dismiss")
    public ResponseEntity<Void> dismissTyreRotationAlert(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        tyreRotationService.dismissTracking(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tyre-rotation/{id}/rotate")
    public ResponseEntity<Map<String, Object>> recordTyreRotation(
            @PathVariable UUID id,
            @RequestBody TyreRotationRecordRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        TyreRotationHistory history = tyreRotationService.recordRotation(id, request != null ? request.getRotationOdometer() : null, principal.getUserId());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("rotationId", history.getId());
        response.put("rotationOdometer", history.getRotationOdometer());
        response.put("rotationDate", history.getRotationDate());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/expiry/{id}/dismiss")
    public ResponseEntity<ExpiryAlert> dismissExpiryAlert(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(expiryAlertService.dismissAlert(id, principal.getUserId()));
    }

    @PostMapping("/expiry/dismiss")
    public ResponseEntity<?> dismissExpiryAlertByItem(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            String itemTypeStr = (String) payload.get("itemType");
            String itemIdStr = (String) payload.get("itemId");

            log.info("Dismiss request - itemType: {}, itemId: {}, userId: {}", itemTypeStr, itemIdStr, principal.getUserId());

            if (itemTypeStr == null || itemIdStr == null) {
                log.error("Missing required fields - itemType: {}, itemId: {}", itemTypeStr, itemIdStr);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "itemType and itemId are required");
                errorResponse.put("itemType", itemTypeStr);
                errorResponse.put("itemId", itemIdStr);
                return ResponseEntity.badRequest().body(errorResponse);
            }

            UUID itemId;
            try {
                itemId = UUID.fromString(itemIdStr);
            } catch (IllegalArgumentException e) {
                log.error("Invalid itemId format: {}", itemIdStr);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid itemId format: " + itemIdStr);
                return ResponseEntity.badRequest().body(errorResponse);
            }

            expiryAlertService.dismissAlertByItem(itemTypeStr, itemId, principal.getUserId());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Alert dismissed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error dismissing alert", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Error dismissing alert: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/expiry/undismiss")
    public ResponseEntity<?> undismissExpiryAlertByItem(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            String itemTypeStr = (String) payload.get("itemType");
            String itemIdStr = (String) payload.get("itemId");

            if (itemTypeStr == null || itemIdStr == null) {
                return ResponseEntity.badRequest().body("itemType and itemId are required");
            }

            UUID itemId = UUID.fromString(itemIdStr);

            return ResponseEntity.ok(expiryAlertService.undismissAlertByItem(itemTypeStr, itemId, principal.getUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid itemType: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error undismissing alert: " + e.getMessage());
        }
    }
}
