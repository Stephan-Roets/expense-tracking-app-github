package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FleetAssignmentHistoryDTO {
    private String vehicleRegistration;
    private String vehicleMake;
    private String vehicleModel;
    private Integer currentOdometer;

    private AssignmentInfo currentDriver;
    private AssignmentInfo previousDriver;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentInfo {
        private String driverName;
        private String driverEmail;
        private OffsetDateTime assignedAt;
        private OffsetDateTime unassignedAt;
        private String assignedByName;
        private String assignedByEmail;
        private String status;
        private Integer odometerAtAssignment;
        private String odometerConfirmationImageUrl;

        // Detailed condition report data (optional)
        private VehicleConditionReportDTO conditionReport;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleConditionReportDTO {
        private String purpose; // ONBOARDING, OFFBOARDING
        private OffsetDateTime createdAt;
        private String completedByName;
        private List<ConditionSectionDTO> sections;
        private List<ManagerNoteDTO> managerNotes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConditionSectionDTO {
        private String sectionType; // EXTERIOR, INTERIOR, MECHANICAL, TYRES, DOCUMENTATION
        private String condition; // GOOD, FAIR, POOR
        private String description;
        private Boolean locked;
        private OffsetDateTime inspectedAt;
        private List<String> imageUrls; // Up to 5 images per section
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManagerNoteDTO {
        private String note;
        private String createdByName;
        private OffsetDateTime createdAt;
    }
}
