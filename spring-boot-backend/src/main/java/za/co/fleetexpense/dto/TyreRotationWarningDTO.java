package za.co.fleetexpense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import za.co.fleetexpense.entity.enums.DrivetrainType;
import za.co.fleetexpense.entity.enums.TyreRotationStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TyreRotationWarningDTO {

    private UUID trackingId;
    private UUID organizationId;
    private UUID vehicleId;
    private String vehicleRegistration;
    private String vehicleName;
    private String tyreBrand;
    private String tyreModel;
    private String tyreSize;
    private LocalDate installationDate;
    private DrivetrainType drivetrainType;
    private Integer rotationIntervalKm;
    private Integer installationOdometer;
    private Integer lastRotationOdometer;
    private LocalDate lastRotationDate;
    private Integer rotationCount;
    private Integer nextRotationOdometer;
    private Integer currentVehicleOdometer;
    private Integer latestFuelOdometer;
    private Integer kmOverdue;
    private TyreRotationStatus rotationStatus;
    private Boolean isActive;
    private Boolean isDismissed;
    private OffsetDateTime dismissedAt;
    private String dismissedByName;
}
