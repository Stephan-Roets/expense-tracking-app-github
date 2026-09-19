package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import za.co.fleetexpense.entity.enums.ExpenseCategory;
import za.co.fleetexpense.enums.TaxExpenseClassification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExpenseDTO {
    private UUID id;
    private UUID organizationId;
    private UUID vehicleId;
    private String vehicleName;
    private UUID userId;
    private String userName;
    private ExpenseCategory category;
    private BigDecimal amountZar;
    private LocalDate expenseDate;
    private String supplierName;
    private String description;
    private String invoiceNumber;

    // Tax and Receipt Fields (from Expense entity)
    private BigDecimal vatAmountZar;
    private String receiptImageUrl;
    private String receiptImageKey;
    private Integer odometerReading;

    // Phase 1: Tax expense classification
    private TaxExpenseClassification taxExpenseClassification;

    // Phase 1: VAT-related fields
    private Boolean amountIncludesVat;
    private Long vatAmountCents;
    private Long netAmountCents;

    // Locking
    private Boolean isTaxDeductible;
    private Boolean isLocked;
    private OffsetDateTime lockedAt;
    private String lockedReason;
    private UUID lockedByUserId;

    // Metadata
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Category-specific nested data
    private FuelLogDTO fuelLog;
    private CarWashDTO carWash;
    private MechanicServiceDTO mechanicService;
    private MaintenanceTopupDTO maintenanceTopup;
    private TyrePurchaseDTO tyrePurchase;
    private InsurancePremiumDTO insurancePremium;
    private VehicleTrackingDTO vehicleTracking;
    private EtollPaymentDTO etollPayment;
    private LicenseRenewalDTO licenseRenewal;
    private RoadworthyCertificateDTO roadworthyCertificate;
    private PersonalLicenseDTO personalLicense;
    private OtherFixedExpenseDTO otherFixedExpense;

    // Vehicle object for display purposes
    private VehicleDTO vehicle;
}
