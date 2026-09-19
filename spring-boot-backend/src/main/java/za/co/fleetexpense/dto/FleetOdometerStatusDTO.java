package za.co.fleetexpense.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface FleetOdometerStatusDTO {
    UUID getVehicleId();
    String getRegistration();
    String getMake();
    String getModel();
    Integer getCurrentOdometer();
    LocalDate getLastOdometerDate();
    UUID getAssignmentId();
    String getAssignedDriverName();
    Instant getAssignedAt();
}
