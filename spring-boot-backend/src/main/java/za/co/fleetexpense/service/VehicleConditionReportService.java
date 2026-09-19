package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.ManagerNoteDTO;
import za.co.fleetexpense.dto.VehicleConditionImageDTO;
import za.co.fleetexpense.dto.VehicleConditionReportDTO;
import za.co.fleetexpense.dto.VehicleConditionSectionDTO;
import za.co.fleetexpense.entity.*;
import za.co.fleetexpense.entity.enums.Condition;
import za.co.fleetexpense.entity.enums.SectionType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.VehicleAssignmentRepository;
import za.co.fleetexpense.repository.VehicleConditionReportRepository;
import za.co.fleetexpense.repository.VehicleConditionSectionRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleConditionReportService {

    private final VehicleConditionReportRepository reportRepository;
    private final VehicleAssignmentRepository assignmentRepository;
    private final VehicleConditionSectionRepository sectionRepository;
    private final VehicleRepository vehicleRepository;

    @Value("${storage.base-path:/app/storage}")
    private String basePath;

    @Transactional
    public VehicleConditionReportDTO createReport(UUID assignmentId, User currentUser) {
        VehicleAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle assignment not found"));

        FleetModeGuard.requireFleetMode(assignment.getVehicle().getOrganization());

        if (!assignment.getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Assignment does not belong to your organization");
        }

        if (reportRepository.findByAssignmentId(assignmentId).isPresent()) {
            throw new ValidationException("Condition report already exists for this assignment");
        }

        VehicleConditionReport report = VehicleConditionReport.builder()
                .assignment(assignment)
                .purpose(za.co.fleetexpense.enums.ConditionReportPurpose.ONBOARDING)
                .createdBy(currentUser)
                .sections(new ArrayList<>())
                .managerNotes(new ArrayList<>())
                .build();

        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO createReportForVehicle(UUID vehicleId, User currentUser) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        if (!vehicle.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Vehicle does not belong to your organization");
        }

        if (reportRepository.findByVehicleId(vehicleId).isPresent()) {
            throw new ValidationException("Condition report already exists for this vehicle");
        }

        VehicleConditionReport report = VehicleConditionReport.builder()
                .vehicle(vehicle)
                .purpose(za.co.fleetexpense.enums.ConditionReportPurpose.ONBOARDING)
                .createdBy(currentUser)
                .sections(new ArrayList<>())
                .managerNotes(new ArrayList<>())
                .build();

        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional(readOnly = true)
    public VehicleConditionReportDTO getReport(UUID assignmentId, User currentUser) {
        VehicleConditionReport report = reportRepository.findByAssignmentId(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition report not found"));

        FleetModeGuard.requireFleetMode(report.getAssignment().getVehicle().getOrganization());

        if (!report.getAssignment().getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        return enrichReportDTO(report);
    }

    @Transactional(readOnly = true)
    public VehicleConditionReportDTO getReportByVehicleId(UUID vehicleId, User currentUser) {
        VehicleConditionReport report = reportRepository.findByVehicleId(vehicleId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition report not found"));

        if (!report.getVehicle().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        return enrichReportDTO(report);
    }

    @Transactional
    public VehicleConditionReportDTO addSection(UUID reportId, SectionType sectionType, Condition condition, String description, User currentUser) {
        VehicleConditionReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition report not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = VehicleConditionSection.builder()
                .report(report)
                .sectionType(sectionType)
                .condition(condition != null ? condition : Condition.GOOD)
                .description(description)
                .locked(false)
                .inspectedAt(OffsetDateTime.now())
                .images(new ArrayList<>())
                .build();

        report.getSections().add(section);
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO addImage(UUID sectionId, String imageUrl, User currentUser) {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = report.getSections().stream()
                .filter(s -> s.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        VehicleConditionImage image = VehicleConditionImage.builder()
                .section(section)
                .imageUrl(imageUrl)
                .build();

        section.getImages().add(image);
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO deleteImage(UUID sectionId, UUID imageId, User currentUser) {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = report.getSections().stream()
                .filter(s -> s.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        section.getImages().removeIf(img -> img.getId().equals(imageId));
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO addManagerNote(UUID reportId, String note, User currentUser) {
        VehicleConditionReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Condition report not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        ManagerNote managerNote = ManagerNote.builder()
                .report(report)
                .note(note)
                .createdBy(currentUser)
                .build();

        report.getManagerNotes().add(managerNote);
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO deleteSection(UUID sectionId, User currentUser) {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = report.getSections().stream()
                .filter(s -> s.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        report.getSections().remove(section);
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO updateSection(UUID sectionId, Condition condition, String notes, User currentUser) {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = report.getSections().stream()
                .filter(s -> s.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        if (condition != null) {
            section.setCondition(condition);
        }
        if (notes != null) {
            section.setDescription(notes);
        }

        // Update the inspected_at timestamp
        section.setInspectedAt(OffsetDateTime.now());

        // Save the section directly to ensure changes are persisted
        sectionRepository.save(section);
        
        // Reload the report to get updated data
        VehicleConditionReport saved = reportRepository.findById(report.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Report not found"));
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO lockSection(UUID sectionId, User currentUser) {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = report.getSections().stream()
                .filter(s -> s.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        section.setLocked(true);
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    @Transactional
    public VehicleConditionReportDTO unlockSection(UUID sectionId, User currentUser) {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        VehicleConditionSection section = report.getSections().stream()
                .filter(s -> s.getId().equals(sectionId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        section.setLocked(false);
        VehicleConditionReport saved = reportRepository.save(report);
        return enrichReportDTO(saved);
    }

    private VehicleConditionReportDTO enrichReportDTO(VehicleConditionReport report) {
        String createdByName = report.getCreatedBy() != null
                ? report.getCreatedBy().getFirstName() + " " + report.getCreatedBy().getLastName()
                : null;

        UUID assignmentId = report.getAssignment() != null ? report.getAssignment().getId() : null;
        UUID vehicleId = report.getVehicle() != null ? report.getVehicle().getId() : null;

        List<VehicleConditionSectionDTO> sectionDTOs = report.getSections().stream()
                .map(this::enrichSectionDTO)
                .collect(Collectors.toList());

        List<ManagerNoteDTO> managerNoteDTOs = report.getManagerNotes().stream()
                .map(this::enrichManagerNoteDTO)
                .collect(Collectors.toList());

        return new VehicleConditionReportDTO(
                report.getId(),
                assignmentId,
                vehicleId,
                report.getCreatedBy().getId(),
                createdByName,
                report.getCreatedAt(),
                report.getUpdatedAt(),
                sectionDTOs,
                managerNoteDTOs
        );
    }

    private VehicleConditionSectionDTO enrichSectionDTO(VehicleConditionSection section) {
        List<VehicleConditionImageDTO> imageDTOs = section.getImages().stream()
                .map(img -> new VehicleConditionImageDTO(
                        img.getId(),
                        img.getSection().getId(),
                        img.getImageUrl(),
                        img.getUploadedAt()
                ))
                .collect(Collectors.toList());

        return new VehicleConditionSectionDTO(
                section.getId(),
                section.getReport().getId(),
                section.getSectionType(),
                section.getCondition(),
                section.getDescription(),
                section.getLocked(),
                section.getInspectedAt(),
                section.getCreatedAt(),
                imageDTOs
        );
    }

    private ManagerNoteDTO enrichManagerNoteDTO(ManagerNote note) {
        String createdByName = note.getCreatedBy() != null
                ? note.getCreatedBy().getFirstName() + " " + note.getCreatedBy().getLastName()
                : null;

        return new ManagerNoteDTO(
                note.getId(),
                note.getReport().getId(),
                note.getNote(),
                note.getCreatedBy().getId(),
                createdByName,
                note.getCreatedAt()
        );
    }

    @Transactional
    public String uploadSectionImage(UUID sectionId, MultipartFile file, User currentUser) throws IOException {
        VehicleConditionReport report = reportRepository.findAll().stream()
                .filter(r -> r.getSections().stream().anyMatch(s -> s.getId().equals(sectionId)))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));

        // Get the organization from either assignment or vehicle
        var organization = report.getAssignment() != null 
            ? report.getAssignment().getVehicle().getOrganization()
            : report.getVehicle().getOrganization();

        if (report.getAssignment() != null) {
            FleetModeGuard.requireFleetMode(organization);
        }

        if (!organization.getId().equals(currentUser.getOrganization().getId())) {
            throw new ValidationException("Report does not belong to your organization");
        }

        // Create upload directory if it doesn't exist
        Path uploadPath = Paths.get(basePath, "vehicle-condition-images");
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        String filename = "section-" + sectionId + "-" + System.currentTimeMillis() + extension;
        Path filePath = uploadPath.resolve(filename);

        // Save file
        Files.copy(file.getInputStream(), filePath);

        // Return URL path for the storage proxy controller (without /api/v1 prefix since frontend adds it)
        return "/storage/vehicle-condition-images/" + filename;
    }
}
