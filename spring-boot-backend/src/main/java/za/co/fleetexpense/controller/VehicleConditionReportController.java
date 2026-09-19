package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.VehicleConditionReportDTO;
import za.co.fleetexpense.dto.VehicleConditionSectionCreateRequest;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.enums.Condition;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.VehicleConditionReportService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicle-condition-reports")
@RequiredArgsConstructor
public class VehicleConditionReportController {

    private final VehicleConditionReportService reportService;
    private final UserRepository userRepository;

    @PostMapping("/assignment/{assignmentId}")
    public ResponseEntity<VehicleConditionReportDTO> createReport(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.createReport(assignmentId, currentUser));
    }

    @PostMapping("/vehicle/{vehicleId}")
    public ResponseEntity<VehicleConditionReportDTO> createReportForVehicle(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.createReportForVehicle(vehicleId, currentUser));
    }

    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<VehicleConditionReportDTO> getReport(
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.getReport(assignmentId, currentUser));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<VehicleConditionReportDTO> getReportByVehicleId(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.getReportByVehicleId(vehicleId, currentUser));
    }

    @PostMapping("/{reportId}/sections")
    public ResponseEntity<VehicleConditionReportDTO> addSection(
            @PathVariable UUID reportId,
            @RequestBody VehicleConditionSectionCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Condition condition = request.condition() != null ? Condition.valueOf(request.condition()) : Condition.GOOD;
        return ResponseEntity.ok(reportService.addSection(reportId, request.sectionType(), condition, request.notes(), currentUser));
    }

    @PostMapping("/sections/{sectionId}/images")
    public ResponseEntity<VehicleConditionReportDTO> addImage(
            @PathVariable UUID sectionId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        try {
            String imageUrl = reportService.uploadSectionImage(sectionId, file, currentUser);
            return ResponseEntity.ok(reportService.addImage(sectionId, imageUrl, currentUser));
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
        }
    }

    @DeleteMapping("/sections/{sectionId}/images/{imageId}")
    public ResponseEntity<VehicleConditionReportDTO> deleteImage(
            @PathVariable UUID sectionId,
            @PathVariable UUID imageId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.deleteImage(sectionId, imageId, currentUser));
    }

    @PostMapping("/{reportId}/manager-notes")
    public ResponseEntity<VehicleConditionReportDTO> addManagerNote(
            @PathVariable UUID reportId,
            @RequestBody java.util.Map<String, String> request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.addManagerNote(reportId, request.get("note"), currentUser));
    }

    @DeleteMapping("/sections/{sectionId}")
    public ResponseEntity<VehicleConditionReportDTO> deleteSection(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.deleteSection(sectionId, currentUser));
    }

    @PutMapping("/sections/{sectionId}")
    public ResponseEntity<VehicleConditionReportDTO> updateSection(
            @PathVariable UUID sectionId,
            @RequestBody VehicleConditionSectionCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Condition condition = request.condition() != null ? Condition.valueOf(request.condition()) : null;
        return ResponseEntity.ok(reportService.updateSection(sectionId, condition, request.notes(), currentUser));
    }

    @PostMapping("/sections/{sectionId}/lock")
    public ResponseEntity<VehicleConditionReportDTO> lockSection(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.lockSection(sectionId, currentUser));
    }

    @PostMapping("/sections/{sectionId}/unlock")
    public ResponseEntity<VehicleConditionReportDTO> unlockSection(
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(reportService.unlockSection(sectionId, currentUser));
    }
}
