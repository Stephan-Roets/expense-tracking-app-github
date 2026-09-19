package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAssistantDTO {
    private UUID id;
    private UUID ownerId;
    private UUID assistantId;
    private String assistantEmail;
    private String assistantFirstName;
    private String assistantLastName;
    private String assistantRole;
    private LocalDate assignedDateRangeStart;
    private LocalDate assignedDateRangeEnd;
    private UUID assignedVehicleId;
    private String assignedVehicleRegistration;
    private Boolean isActive;
    private OffsetDateTime removedAt;
    private UUID removedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
