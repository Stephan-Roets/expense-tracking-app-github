package za.co.fleetexpense.dto;

import za.co.fleetexpense.entity.enums.SectionType;

public record VehicleConditionSectionCreateRequest(
    SectionType sectionType,
    String condition,
    String notes
) {
    public String condition() {
        return condition;
    }
    
    public VehicleConditionSectionCreateRequest {
        // Allow sectionType to be null for updates
    }
}
