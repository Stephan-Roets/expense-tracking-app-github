package za.co.fleetexpense.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.*;
import za.co.fleetexpense.entity.*;
import za.co.fleetexpense.entity.enums.CarWashType;
import za.co.fleetexpense.entity.enums.ExpenseCategory;
import za.co.fleetexpense.entity.enums.MaintenanceItemType;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.ServiceType;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.enums.TaxExpenseClassification;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.ExpenseMapper;
import za.co.fleetexpense.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final ExpenseMapper expenseMapper;
    private final FuelLogRepository fuelLogRepository;
    private final CarWashRepository carWashRepository;
    private final MechanicServiceRepository mechanicServiceRepository;
    private final MaintenanceTopupRepository maintenanceTopupRepository;
    private final TyreRepository tyreRepository;
    private final TyreRotationService tyreRotationService;
    private final TyreRotationTrackingRepository tyreRotationTrackingRepository;
    private final ObjectMapper objectMapper;
    private final OdometerDriftAlertService odometerDriftAlertService;
    private final MechanicServiceAlertService mechanicServiceAlertService;
    private final ExpiryAlertRepository expiryAlertRepository;
    private final PermissionService permissionService;
    private final UserAssistantRepository userAssistantRepository;

    // ==================== DTO-BASED CRUD OPERATIONS ====================

    /**
     * Phase 1: Derive tax expense classification from expense category
     * Conservative approach: known fuel/maintenance categories become qualifying,
     * uncertain categories remain uncategorized
     */
    private TaxExpenseClassification deriveTaxClassification(ExpenseCategory category) {
        if (category == null) {
            return TaxExpenseClassification.UNCATEGORIZED;
        }

        // Known qualifying current expenses
        switch (category) {
            case FUEL_LOG:
            case MAINTENANCE_TOPUP:
            case MECHANIC_SERVICE:
            case CAR_WASH:
            case TIRES:
            case INSURANCE_PREMIUM:
            case VEHICLE_TRACKING:
            case LICENSE_RENEWAL:
            case ROADWORTHY:
                return TaxExpenseClassification.QUALIFYING_CURRENT_EXPENSE;
            
            // Uncertain categories - require manual review
            case ETOLL_SANRAL:
            case OTHER_FIXED:
            case PERSONAL_LICENSE:
            default:
                return TaxExpenseClassification.UNCATEGORIZED;
        }
    }

    // Helper to check if user is an assistant and apply assistant constraints
    private boolean shouldIncludeExpenseForAssistant(Expense expense, UUID userId) {
        List<za.co.fleetexpense.entity.UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        if (assistantRelationships.isEmpty()) {
            return true; // Not an assistant, no filtering
        }

        za.co.fleetexpense.entity.UserAssistant relationship = assistantRelationships.get(0);

        // Filter by assigned vehicle if specified
        if (relationship.getAssignedVehicleId() != null) {
            if (!relationship.getAssignedVehicleId().equals(expense.getVehicle().getId())) {
                return false;
            }
        }

        // Filter by date range if specified
        LocalDate expenseDate = expense.getExpenseDate();
        if (relationship.getAssignedDateRangeStart() != null && expenseDate.isBefore(relationship.getAssignedDateRangeStart())) {
            return false;
        }
        if (relationship.getAssignedDateRangeEnd() != null && expenseDate.isAfter(relationship.getAssignedDateRangeEnd())) {
            return false;
        }

        return true;
    }

    @Transactional(readOnly = true)
    public List<ExpenseDTO> getAllByOrganization(UUID organizationId, UUID userId, UserRole role, OrganizationMode organizationMode) {
        log.info("getAllByOrganization - orgId: {}, userId: {}, role: {}, organizationMode: {}", organizationId, userId, role, organizationMode);
        
        // Check if user is an individual account assistant (via user_assistants table)
        List<za.co.fleetexpense.entity.UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        boolean isIndividualAssistant = !assistantRelationships.isEmpty();
        
        List<Expense> expenses;
        if (isIndividualAssistant) {
            // Individual assistants see owner's expenses (filtered by assistant constraints)
            za.co.fleetexpense.entity.UserAssistant relationship = assistantRelationships.get(0);
            UUID ownerId = relationship.getOwnerId();
            expenses = expenseRepository.findByOrganizationIdAndUserIdOrderByExpenseDateDesc(organizationId, ownerId);
        } else if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdOrderByExpenseDateDesc(organizationId, userId);
        } else {
            expenses = expenseRepository.findByOrganizationIdOrderByExpenseDateDesc(organizationId);
        }
        log.info("Found {} expenses for orgId: {}", expenses.size(), organizationId);
        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .filter(expense -> role != UserRole.RENTAL_CUSTOMER || expense.getCategory() == ExpenseCategory.FUEL_LOG)
                .filter(expense -> shouldIncludeExpenseForAssistant(expense, userId))
                .map(expenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExpenseDTO> getByCategory(UUID organizationId, ExpenseCategory category, UUID userId, UserRole role, OrganizationMode organizationMode) {
        // RENTAL_CUSTOMER can only access FUEL_LOG category
        if (role == UserRole.RENTAL_CUSTOMER && category != ExpenseCategory.FUEL_LOG) {
            return List.of();
        }
        
        // Check if user is an individual account assistant (via user_assistants table)
        List<za.co.fleetexpense.entity.UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        boolean isIndividualAssistant = !assistantRelationships.isEmpty();
        
        List<Expense> expenses;
        if (isIndividualAssistant) {
            // Individual assistants see owner's expenses (filtered by assistant constraints)
            za.co.fleetexpense.entity.UserAssistant relationship = assistantRelationships.get(0);
            UUID ownerId = relationship.getOwnerId();
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndCategoryOrderByExpenseDateDesc(organizationId, ownerId, category);
        } else if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndCategoryOrderByExpenseDateDesc(organizationId, userId, category);
        } else {
            expenses = expenseRepository.findByOrganizationIdAndCategoryOrderByExpenseDateDesc(organizationId, category);
        }
        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .filter(expense -> shouldIncludeExpenseForAssistant(expense, userId))
                .map(expenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExpenseDTO> getByVehicle(UUID organizationId, UUID vehicleId, UUID userId, UserRole role, OrganizationMode organizationMode) {
        if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found");
            }
        }
        List<Expense> expenses = expenseRepository.findByOrganizationIdAndVehicleIdOrderByExpenseDateDesc(organizationId, vehicleId);
        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .filter(expense -> shouldIncludeExpenseForAssistant(expense, userId))
                .map(expenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExpenseDTO> getByDateRange(UUID organizationId, LocalDate start, LocalDate end, UUID userId, UserRole role, OrganizationMode organizationMode) {
        List<Expense> expenses;
        if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndDateRange(organizationId, userId, start, end);
        } else {
            expenses = expenseRepository.findByOrganizationIdAndDateRange(organizationId, start, end);
        }
        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .filter(expense -> role != UserRole.RENTAL_CUSTOMER || expense.getCategory() == ExpenseCategory.FUEL_LOG)
                .filter(expense -> shouldIncludeExpenseForAssistant(expense, userId))
                .map(expenseMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExpenseDTO getById(UUID id, UUID userId, UserRole role, OrganizationMode organizationMode) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));
        if (role == UserRole.DRIVER || role == UserRole.RENTAL_CUSTOMER) {
            if (!expense.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Expense not found with id: " + id);
            }
            if (!shouldIncludeExpenseForRole(expense, role, organizationMode)) {
                throw new ResourceNotFoundException("Expense not found with id: " + id);
            }
            // RENTAL_CUSTOMER can only access FUEL_LOG
            if (role == UserRole.RENTAL_CUSTOMER && expense.getCategory() != ExpenseCategory.FUEL_LOG) {
                throw new ResourceNotFoundException("Expense not found with id: " + id);
            }
        }
        ExpenseDTO dto = expenseMapper.toDTO(expense);

        // Populate category-specific nested data
        populateCategorySpecificData(dto, expense);

        return dto;
    }

    private void populateCategorySpecificData(ExpenseDTO dto, Expense expense) {
        ExpenseCategory category = expense.getCategory();
        UUID expenseId = expense.getId();

        switch (category) {
            case FUEL_LOG:
                fuelLogRepository.findByExpenseId(expenseId).ifPresent(fuelLog -> {
                    FuelLogDTO fuelLogDTO = new FuelLogDTO();
                    fuelLogDTO.setId(fuelLog.getId());
                    fuelLogDTO.setExpenseId(fuelLog.getExpense().getId());
                    fuelLogDTO.setVehicleId(fuelLog.getExpense().getVehicle().getId());
                    fuelLogDTO.setVehicleRegistration(fuelLog.getExpense().getVehicle().getRegistrationNumber());
                    fuelLogDTO.setFuelType(fuelLog.getFuelType());
                    fuelLogDTO.setLiters(fuelLog.getLiters());
                    fuelLogDTO.setPricePerLiter(fuelLog.getPricePerLiter());
                    fuelLogDTO.setTotalCost(fuelLog.getLiters().multiply(fuelLog.getPricePerLiter()));
                    fuelLogDTO.setFullTank(fuelLog.getFullTank());
                    fuelLogDTO.setStationName(fuelLog.getStationName());
                    fuelLogDTO.setStationLocation(fuelLog.getStationLocation());
                    fuelLogDTO.setPreviousOdometer(fuelLog.getPreviousOdometer());
                    fuelLogDTO.setCurrentOdometer(fuelLog.getExpense().getOdometerReading());
                    fuelLogDTO.setKmSinceLastFill(fuelLog.getKmSinceLastFill());
                    fuelLogDTO.setEfficiencyKmPerLiter(fuelLog.getEfficiencyKmPerLiter());
                    fuelLogDTO.setConsumptionLPer100km(fuelLog.getConsumptionLPer100km());
                    fuelLogDTO.setIsBaselineFill(fuelLog.getIsBaselineFill());
                    fuelLogDTO.setConsumptionNotes(fuelLog.getConsumptionNotes());
                    fuelLogDTO.setConsumptionCalculatedAt(fuelLog.getConsumptionCalculatedAt());
                    fuelLogDTO.setGpsLatitude(fuelLog.getGpsLatitude());
                    fuelLogDTO.setGpsLongitude(fuelLog.getGpsLongitude());
                    fuelLogDTO.setGpsAccuracyMeters(fuelLog.getGpsAccuracyMeters());
                    fuelLogDTO.setCreatedAt(fuelLog.getCreatedAt());
                    dto.setFuelLog(fuelLogDTO);
                });
                break;

            case CAR_WASH:
                carWashRepository.findByExpenseId(expenseId).ifPresent(carWash -> {
                    CarWashDTO carWashDTO = new CarWashDTO();
                    carWashDTO.setWashType(carWash.getWashType() != null ? carWash.getWashType().name() : null);
                    carWashDTO.setCostZar(expense.getAmountZar());
                    carWashDTO.setWashName(carWash.getWashName());
                    carWashDTO.setWashLocation(carWash.getWashLocation());
                    carWashDTO.setWashDate(expense.getExpenseDate() != null ? expense.getExpenseDate().toString() : null);
                    carWashDTO.setNotes(carWash.getNotes());
                    dto.setCarWash(carWashDTO);
                });
                break;

            case MECHANIC_SERVICE:
                mechanicServiceRepository.findByExpenseId(expenseId).ifPresent(mechanicService -> {
                    MechanicServiceDTO mechanicServiceDTO = new MechanicServiceDTO();
                    mechanicServiceDTO.setServiceType(mechanicService.getServiceType() != null ? mechanicService.getServiceType().name() : null);
                    mechanicServiceDTO.setWorkshopName(mechanicService.getWorkshopName());
                    mechanicServiceDTO.setWorkDescription(mechanicService.getWorkDescription());
                    BigDecimal totalCost = expense.getAmountZar() != null
                            ? expense.getAmountZar()
                            : (mechanicService.getLaborCostZar() != null ? mechanicService.getLaborCostZar() : BigDecimal.ZERO)
                            .add(mechanicService.getPartsCostZar() != null ? mechanicService.getPartsCostZar() : BigDecimal.ZERO);
                    mechanicServiceDTO.setTotalCostZar(totalCost);
                    mechanicServiceDTO.setLaborCostZar(mechanicService.getLaborCostZar());
                    mechanicServiceDTO.setPartsCostZar(mechanicService.getPartsCostZar());
                    mechanicServiceDTO.setInvoiceNumber(expense.getInvoiceNumber());
                    mechanicServiceDTO.setServiceDate(expense.getExpenseDate() != null ? expense.getExpenseDate().toString() : null);
                    mechanicServiceDTO.setMechanicName(mechanicService.getTechnicianName());
                    mechanicServiceDTO.setPartsUsed(mechanicService.getPartsReplaced());
                    if (expense.getExtraFields() != null) {
                        try {
                            JsonNode extraFields = objectMapper.readTree(expense.getExtraFields());
                            mechanicServiceDTO.setGlassProvider(getStringOrNull(extraFields, "glassProvider"));
                            mechanicServiceDTO.setExcessAmountZar(getBigDecimalOrNull(extraFields, "excessAmountZar"));
                            mechanicServiceDTO.setNotes(getStringOrNull(extraFields, "notes"));
                        } catch (Exception e) {
                            log.warn("Failed to parse mechanic extraFields for expense {}: {}", expenseId, e.getMessage());
                        }
                    }
                    dto.setMechanicService(mechanicServiceDTO);
                });
                break;

            case MAINTENANCE_TOPUP:
                maintenanceTopupRepository.findByExpenseId(expenseId).ifPresent(maintenanceTopup -> {
                    MaintenanceTopupDTO maintenanceTopupDTO = new MaintenanceTopupDTO();
                    maintenanceTopupDTO.setItemType(maintenanceTopup.getItemType() != null ? maintenanceTopup.getItemType().name() : null);
                    maintenanceTopupDTO.setShopName(maintenanceTopup.getShopName());
                    maintenanceTopupDTO.setPriceZar(expense.getAmountZar());
                    maintenanceTopupDTO.setPurchaseDate(expense.getExpenseDate() != null ? expense.getExpenseDate().toString() : null);
                    maintenanceTopupDTO.setBrand(maintenanceTopup.getItemBrand());
                    maintenanceTopupDTO.setItemBrand(maintenanceTopup.getItemBrand());
                    maintenanceTopupDTO.setItemQuantity(maintenanceTopup.getItemQuantity() != null ? maintenanceTopup.getItemQuantity().intValue() : null);
                    maintenanceTopupDTO.setNotes(maintenanceTopup.getNotes());
                    dto.setMaintenanceTopup(maintenanceTopupDTO);
                });
                break;

            case TIRES:
                tyreRepository.findByExpenseId(expenseId).ifPresent(tyre -> {
                    TyrePurchaseDTO tyrePurchaseDTO = new TyrePurchaseDTO();
                    tyrePurchaseDTO.setBrand(tyre.getBrand());
                    tyrePurchaseDTO.setModel(tyre.getModel());
                    tyrePurchaseDTO.setSize(tyre.getSize());
                    tyrePurchaseDTO.setQuantity(tyre.getQuantity());
                    tyrePurchaseDTO.setPosition(tyre.getPosition());
                    tyrePurchaseDTO.setPurchaseOdometer(tyre.getPurchaseOdometer());
                    tyrePurchaseDTO.setTreadDepthMm(tyre.getTreadDepthMm());
                    tyrePurchaseDTO.setExpectedLifespanKm(tyre.getExpectedLifespanKm());
                    tyrePurchaseDTO.setWarrantyKm(tyre.getWarrantyKm());
                    tyrePurchaseDTO.setSupplier(expense.getSupplierName());
                    tyrePurchaseDTO.setNotes(tyre.getNotes());
                    
                    // Add rotation tracking info
                    tyreRotationTrackingRepository.findByTyreExpenseId(expenseId).ifPresent(tracking -> {
                        tyrePurchaseDTO.setEnableRotationTracking(tracking.getIsActive());
                        tyrePurchaseDTO.setDrivetrainType(tracking.getDrivetrainType() != null ? tracking.getDrivetrainType().name() : null);
                        log.info("Populated rotation tracking for expense {}: enableRotationTracking={}, drivetrainType={}", 
                            expenseId, tracking.getIsActive(), tracking.getDrivetrainType());
                    });
                    
                    if (tyrePurchaseDTO.getEnableRotationTracking() == null) {
                        log.warn("No rotation tracking found for tyre expense {}", expenseId);
                        tyrePurchaseDTO.setEnableRotationTracking(false);
                    }
                    
                    dto.setTyrePurchase(tyrePurchaseDTO);
                });
                break;

            case INSURANCE_PREMIUM:
            case VEHICLE_TRACKING:
            case ETOLL_SANRAL:
            case LICENSE_RENEWAL:
            case ROADWORTHY:
            case PERSONAL_LICENSE:
            case OTHER_FIXED:
                // For these categories, data is primarily stored in extraFields as JSON
                log.info("Processing category {} with extraFields: {}", category, expense.getExtraFields());
                if (expense.getExtraFields() != null) {
                    try {
                        JsonNode extraFields = objectMapper.readTree(expense.getExtraFields());
                        log.info("Parsed extraFields JSON: {}", extraFields);
                        switch (category) {
                            case INSURANCE_PREMIUM:
                                InsurancePremiumDTO insuranceDTO = new InsurancePremiumDTO();
                                String insurerName = getStringOrNull(extraFields, "insurerName");
                                if (insurerName == null) {
                                    insurerName = getStringOrNull(extraFields, "insuranceProvider");
                                }
                                String policyType = getStringOrNull(extraFields, "policyType");
                                if (policyType == null) {
                                    policyType = getStringOrNull(extraFields, "coverageType");
                                }
                                String coverageStartDate = getStringOrNull(extraFields, "coverageStartDate");
                                if (coverageStartDate == null) {
                                    coverageStartDate = getStringOrNull(extraFields, "policyStartDate");
                                }
                                String coverageEndDate = getStringOrNull(extraFields, "coverageEndDate");
                                if (coverageEndDate == null) {
                                    coverageEndDate = getStringOrNull(extraFields, "policyEndDate");
                                }
                                BigDecimal monthlyPremiumZar = getBigDecimalOrNull(extraFields, "monthlyPremiumZar");
                                if (monthlyPremiumZar == null) {
                                    monthlyPremiumZar = getBigDecimalOrNull(extraFields, "premiumAmountZar");
                                }
                                insuranceDTO.setInsurerName(insurerName);
                                insuranceDTO.setPolicyNumber(getStringOrNull(extraFields, "policyNumber"));
                                insuranceDTO.setPolicyType(policyType);
                                insuranceDTO.setPremiumAmountZar(monthlyPremiumZar);
                                insuranceDTO.setMonthlyPremiumZar(monthlyPremiumZar);
                                insuranceDTO.setCoverageStartDate(coverageStartDate);
                                insuranceDTO.setCoverageEndDate(coverageEndDate);
                                insuranceDTO.setExcessAmountZar(getBigDecimalOrNull(extraFields, "excessAmountZar"));
                                insuranceDTO.setOdometerReading(getIntOrNull(extraFields, "odometerReading"));
                                insuranceDTO.setOdometerReadingDate(getStringOrNull(extraFields, "odometerReadingDate"));
                                insuranceDTO.setBrokerName(getStringOrNull(extraFields, "brokerName"));
                                insuranceDTO.setBrokerPhone(getStringOrNull(extraFields, "brokerPhone"));
                                insuranceDTO.setClaimPhoneNumber(getStringOrNull(extraFields, "claimPhoneNumber"));
                                insuranceDTO.setCoverDetails(getStringOrNull(extraFields, "coverDetails"));
                                insuranceDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting insurancePremium DTO: {}", insuranceDTO);
                                dto.setInsurancePremium(insuranceDTO);
                                break;

                            case VEHICLE_TRACKING:
                                VehicleTrackingDTO trackingDTO = new VehicleTrackingDTO();
                                String providerName = getStringOrNull(extraFields, "providerName");
                                if (providerName == null) {
                                    providerName = getStringOrNull(extraFields, "trackingProvider");
                                }
                                trackingDTO.setProviderName(providerName);
                                trackingDTO.setSubscriptionType(getStringOrNull(extraFields, "subscriptionType"));
                                trackingDTO.setMonthlyFeeZar(getBigDecimalOrNull(extraFields, "monthlyFeeZar"));
                                trackingDTO.setSubscriptionStartDate(getStringOrNull(extraFields, "subscriptionStartDate"));
                                trackingDTO.setSubscriptionEndDate(getStringOrNull(extraFields, "subscriptionEndDate"));
                                trackingDTO.setDeviceSerialNumber(getStringOrNull(extraFields, "deviceSerialNumber"));
                                trackingDTO.setDeviceType(getStringOrNull(extraFields, "deviceType"));
                                trackingDTO.setInstallationDate(getStringOrNull(extraFields, "installationDate"));
                                trackingDTO.setInstallationFeeZar(getBigDecimalOrNull(extraFields, "installationFeeZar"));
                                trackingDTO.setContractDurationMonths(getIntOrNull(extraFields, "contractDurationMonths"));
                                trackingDTO.setRecoveryIncluded(getBooleanOrNull(extraFields, "recoveryIncluded"));
                                trackingDTO.setOdometerReading(getIntOrNull(extraFields, "odometerReading"));
                                trackingDTO.setOdometerReadingDate(getStringOrNull(extraFields, "odometerReadingDate"));
                                trackingDTO.setAppLoginEmail(getStringOrNull(extraFields, "appLoginEmail"));
                                trackingDTO.setSupportPhone(getStringOrNull(extraFields, "supportPhone"));
                                trackingDTO.setFeatures(getStringOrNull(extraFields, "features"));
                                trackingDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting vehicleTracking DTO: {}", trackingDTO);
                                dto.setVehicleTracking(trackingDTO);
                                break;

                            case ETOLL_SANRAL:
                                EtollPaymentDTO etollDTO = new EtollPaymentDTO();
                                etollDTO.setAccountNumber(getStringOrNull(extraFields, "accountNumber"));
                                etollDTO.setTagSerialNumber(getStringOrNull(extraFields, "tagSerialNumber"));
                                etollDTO.setVehicleRegistration(getStringOrNull(extraFields, "vehicleRegistration"));
                                etollDTO.setPaymentMethod(getStringOrNull(extraFields, "paymentMethod"));
                                etollDTO.setTollRoutes(getStringOrNull(extraFields, "tollRoutes"));
                                etollDTO.setTotalGantries(getIntOrNull(extraFields, "totalGantries"));
                                etollDTO.setPeriodStartDate(getStringOrNull(extraFields, "periodStartDate"));
                                etollDTO.setPeriodEndDate(getStringOrNull(extraFields, "periodEndDate"));
                                etollDTO.setTotalAmountZar(getBigDecimalOrNull(extraFields, "totalAmountZar"));
                                etollDTO.setVatAmountZar(getBigDecimalOrNull(extraFields, "vatAmountZar"));
                                etollDTO.setReferenceNumber(getStringOrNull(extraFields, "referenceNumber"));
                                etollDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting etollPayment DTO: {}", etollDTO);
                                dto.setEtollPayment(etollDTO);
                                break;

                            case LICENSE_RENEWAL:
                                LicenseRenewalDTO licenseDTO = new LicenseRenewalDTO();
                                String registrationAuthority = getStringOrNull(extraFields, "registrationAuthority");
                                if (registrationAuthority == null) {
                                    registrationAuthority = getStringOrNull(extraFields, "issuingAuthority");
                                }
                                String renewalDate = getStringOrNull(extraFields, "renewalDate");
                                if (renewalDate == null && expense.getExpenseDate() != null) {
                                    renewalDate = expense.getExpenseDate().toString();
                                }
                                String newExpiryDate = getStringOrNull(extraFields, "newExpiryDate");
                                if (newExpiryDate == null) {
                                    newExpiryDate = getStringOrNull(extraFields, "expiryDate");
                                }
                                licenseDTO.setLicenseType(getStringOrNull(extraFields, "licenseType"));
                                licenseDTO.setLicenseNumber(getStringOrNull(extraFields, "licenseNumber"));
                                licenseDTO.setRenewalDate(renewalDate);
                                licenseDTO.setExpiryDate(newExpiryDate);
                                licenseDTO.setRegistrationAuthority(registrationAuthority);
                                licenseDTO.setPreviousExpiryDate(getStringOrNull(extraFields, "previousExpiryDate"));
                                licenseDTO.setNewExpiryDate(newExpiryDate);
                                licenseDTO.setRenewalFeeZar(getBigDecimalOrNull(extraFields, "renewalFeeZar"));
                                licenseDTO.setPenaltiesZar(getBigDecimalOrNull(extraFields, "penaltiesZar"));
                                licenseDTO.setArrearsZar(getBigDecimalOrNull(extraFields, "arrearsZar"));
                                licenseDTO.setTransactionNumber(getStringOrNull(extraFields, "transactionNumber"));
                                licenseDTO.setRenewalMethod(getStringOrNull(extraFields, "renewalMethod"));
                                licenseDTO.setProcessingDays(getIntOrNull(extraFields, "processingDays"));
                                licenseDTO.setOdometerReading(getIntOrNull(extraFields, "odometerReading"));
                                licenseDTO.setIssuingAuthority(registrationAuthority);
                                licenseDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting licenseRenewal DTO: {}", licenseDTO);
                                dto.setLicenseRenewal(licenseDTO);
                                break;

                            case ROADWORTHY:
                                RoadworthyCertificateDTO roadworthyDTO = new RoadworthyCertificateDTO();
                                String testingStationName = getStringOrNull(extraFields, "testingStationName");
                                if (testingStationName == null) {
                                    testingStationName = getStringOrNull(extraFields, "testCenter");
                                }
                                String testDate = getStringOrNull(extraFields, "testDate");
                                if (testDate == null && expense.getExpenseDate() != null) {
                                    testDate = expense.getExpenseDate().toString();
                                }
                                String expiryDate = getStringOrNull(extraFields, "expiryDate");
                                Integer vehicleOdometer = getIntOrNull(extraFields, "vehicleOdometer");
                                if (vehicleOdometer == null) {
                                    vehicleOdometer = getIntOrNull(extraFields, "odometerReading");
                                }
                                roadworthyDTO.setTestingStationName(testingStationName);
                                roadworthyDTO.setTestingStationAddress(getStringOrNull(extraFields, "testingStationAddress"));
                                roadworthyDTO.setTestingStationPhone(getStringOrNull(extraFields, "testingStationPhone"));
                                roadworthyDTO.setTestDate(testDate);
                                roadworthyDTO.setTestResult(getStringOrNull(extraFields, "testResult"));
                                roadworthyDTO.setTestFeeZar(getBigDecimalOrNull(extraFields, "testFeeZar"));
                                roadworthyDTO.setRetestFeeZar(getBigDecimalOrNull(extraFields, "retestFeeZar"));
                                roadworthyDTO.setCertificateExpiryDate(expiryDate);
                                roadworthyDTO.setExpiryDate(expiryDate);
                                roadworthyDTO.setCertificateNumber(getStringOrNull(extraFields, "certificateNumber"));
                                roadworthyDTO.setInspectorName(getStringOrNull(extraFields, "inspectorName"));
                                roadworthyDTO.setVehicleOdometer(vehicleOdometer);
                                roadworthyDTO.setFailureReasons(getStringOrNull(extraFields, "failureReasons"));
                                roadworthyDTO.setConditionsApplied(getStringOrNull(extraFields, "conditionsApplied"));
                                roadworthyDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting roadworthyCertificate DTO: {}", roadworthyDTO);
                                dto.setRoadworthyCertificate(roadworthyDTO);
                                break;

                            case PERSONAL_LICENSE:
                                PersonalLicenseDTO personalLicenseDTO = new PersonalLicenseDTO();
                                personalLicenseDTO.setLicenseType(getStringOrNull(extraFields, "licenseType"));
                                personalLicenseDTO.setLicenseNumber(getStringOrNull(extraFields, "licenseNumber"));
                                personalLicenseDTO.setLicenseCode(getStringOrNull(extraFields, "licenseCode"));
                                personalLicenseDTO.setIssueDate(getStringOrNull(extraFields, "issueDate"));
                                personalLicenseDTO.setExpiryDate(getStringOrNull(extraFields, "expiryDate"));
                                personalLicenseDTO.setRenewalFeeZar(getBigDecimalOrNull(extraFields, "renewalFeeZar"));
                                personalLicenseDTO.setPenaltiesZar(getBigDecimalOrNull(extraFields, "penaltiesZar"));
                                personalLicenseDTO.setRenewalMethod(getStringOrNull(extraFields, "renewalMethod"));
                                personalLicenseDTO.setIssuingAuthority(getStringOrNull(extraFields, "issuingAuthority"));
                                personalLicenseDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting personalLicense DTO: {}", personalLicenseDTO);
                                dto.setPersonalLicense(personalLicenseDTO);
                                break;

                            case OTHER_FIXED:
                                // IMPORTANT: categoryLabel is used by the recurring expense system to identify expense types (e.g., "Parking", "Tolls", "Fines")
                                OtherFixedExpenseDTO otherFixedDTO = new OtherFixedExpenseDTO();
                                String categoryLabel = getStringOrNull(extraFields, "categoryLabel");
                                otherFixedDTO.setExpenseDescription(expense.getDescription());
                                otherFixedDTO.setCategoryLabel(categoryLabel != null ? categoryLabel : category.name());
                                otherFixedDTO.setProviderName(expense.getSupplierName());
                                otherFixedDTO.setCostZar(expense.getAmountZar());
                                otherFixedDTO.setExpenseDate(expense.getExpenseDate() != null ? expense.getExpenseDate().toString() : null);
                                otherFixedDTO.setReferenceNumber(getStringOrNull(extraFields, "referenceNumber"));
                                if (extraFields.has("isRecurring") && !extraFields.get("isRecurring").isNull()) {
                                    otherFixedDTO.setIsRecurring(extraFields.get("isRecurring").asBoolean());
                                }
                                otherFixedDTO.setRecurrenceFrequency(getStringOrNull(extraFields, "recurrenceFrequency"));
                                otherFixedDTO.setPeriodStartDate(getStringOrNull(extraFields, "periodStartDate"));
                                otherFixedDTO.setPeriodEndDate(getStringOrNull(extraFields, "periodEndDate"));
                                otherFixedDTO.setNotes(getStringOrNull(extraFields, "notes"));
                                log.info("Setting otherFixedExpense DTO from extraFields: {}", otherFixedDTO);
                                dto.setOtherFixedExpense(otherFixedDTO);
                                break;
                        }
                    } catch (Exception e) {
                        log.error("Failed to parse extraFields for expense {}: {}", expenseId, e.getMessage());
                    }
                }
                // Fallback for OTHER_FIXED: even if extraFields is null or could not be parsed,
                // still populate a minimal DTO from the core expense fields so edit forms prefill.
                if (category == ExpenseCategory.OTHER_FIXED && dto.getOtherFixedExpense() == null) {
                    OtherFixedExpenseDTO otherFixedDTO = new OtherFixedExpenseDTO();
                    otherFixedDTO.setExpenseDescription(expense.getDescription());
                    otherFixedDTO.setCategoryLabel(category.name());
                    otherFixedDTO.setProviderName(expense.getSupplierName());
                    otherFixedDTO.setCostZar(expense.getAmountZar());
                    otherFixedDTO.setExpenseDate(expense.getExpenseDate() != null ? expense.getExpenseDate().toString() : null);
                    log.info("Setting otherFixedExpense DTO from core fields (fallback): {}", otherFixedDTO);
                    dto.setOtherFixedExpense(otherFixedDTO);
                }
                break;
        }
    }

    private String getStringOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private BigDecimal getBigDecimalOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? new BigDecimal(node.get(field).asText()) : null;
    }

    private Integer getIntOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asInt() : null;
    }

    private Boolean getBooleanOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asBoolean() : null;
    }

    private boolean shouldIncludeExpenseForRole(Expense expense, UserRole role, OrganizationMode organizationMode) {
        if (role != UserRole.DRIVER || (organizationMode != OrganizationMode.BUSINESS_FLEET && organizationMode != OrganizationMode.COMPANY)) {
            return true;
        }
        ExpenseCategory category = expense.getCategory();
        return category != ExpenseCategory.INSURANCE_PREMIUM
                && category != ExpenseCategory.VEHICLE_TRACKING
                && category != ExpenseCategory.ROADWORTHY;
    }

    public List<String> getAvailableCategories(UUID organizationId, UserRole role, OrganizationMode organizationMode) {
        return Arrays.stream(ExpenseCategory.values())
                .filter(category -> shouldIncludeCategoryForRole(category, role, organizationMode))
                .filter(category -> permissionService.isAllowed(organizationId, "EXPENSE_CATEGORY", category.name(), role.name()))
                .map(ExpenseCategory::name)
                .collect(Collectors.toList());
    }

    private boolean shouldIncludeCategoryForRole(ExpenseCategory category, UserRole role, OrganizationMode organizationMode) {
        if (role != UserRole.DRIVER || (organizationMode != OrganizationMode.BUSINESS_FLEET && organizationMode != OrganizationMode.COMPANY)) {
            return true;
        }
        return category != ExpenseCategory.INSURANCE_PREMIUM
                && category != ExpenseCategory.VEHICLE_TRACKING
                && category != ExpenseCategory.ROADWORTHY;
    }

    @Transactional
    public ExpenseDTO updateEtollExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.ETOLL_SANRAL) {
            throw new ValidationException("Expense is not an E-Toll (SANRAL) expense");
        }

        // Update basic scalar fields
        // Support both 'amount' (original API) and 'amountZar' (form field)
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "amountZar");
        }
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "totalAmountZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            // Expect ISO string; trim time portion if present
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "E-Toll");
        }

        // Recalculate VAT at 15% if amount is present
        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        // Rebuild extraFields JSON from request data
        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("accountNumber", getStringOrNull(root, "accountNumber"));
        extraFields.put("tagSerialNumber", getStringOrNull(root, "tagSerialNumber"));
        extraFields.put("vehicleRegistration", getStringOrNull(root, "vehicleRegistration"));
        extraFields.put("paymentMethod", getStringOrNull(root, "paymentMethod"));
        extraFields.put("tollRoutes", getStringOrNull(root, "tollRoutes"));
        extraFields.put("totalGantries", getIntOrNull(root, "totalGantries"));
        extraFields.put("periodStartDate", getStringOrNull(root, "periodStartDate"));
        extraFields.put("periodEndDate", getStringOrNull(root, "periodEndDate"));
        extraFields.put("totalAmountZar", getBigDecimalOrNull(root, "totalAmountZar"));
        extraFields.put("vatAmountZar", getBigDecimalOrNull(root, "vatAmountZar"));
        extraFields.put("referenceNumber", getStringOrNull(root, "referenceNumber"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated e-toll expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateInsuranceExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.INSURANCE_PREMIUM) {
            throw new ValidationException("Expense is not an Insurance Premium expense");
        }

        // Update basic scalar fields
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            // Prefer the insurance-specific premium amount when editing
            amount = getBigDecimalOrNull(root, "premiumAmountZar");
        }
        if (amount == null) {
            // Some forms may still use monthlyPremiumZar
            amount = getBigDecimalOrNull(root, "monthlyPremiumZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        // Keep supplierName aligned with insurerName where possible
        String insurerName = getStringOrNull(root, "insurerName");
        if (insurerName != null) {
            existing.setSupplierName(insurerName);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Insurance Premium");
        }

        Integer odometerReading = getIntOrNull(root, "odometerReading");
        existing.setOdometerReading(odometerReading);

        // Recalculate VAT if amount is present
        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        // Rebuild extraFields JSON from request data
        BigDecimal premiumAmount = getBigDecimalOrNull(root, "monthlyPremiumZar");
        if (premiumAmount == null) {
            premiumAmount = getBigDecimalOrNull(root, "premiumAmountZar");
        }
        String policyType = getStringOrNull(root, "policyType");
        if (policyType == null) {
            policyType = getStringOrNull(root, "coverageType");
        }
        String coverageStartDate = getStringOrNull(root, "coverageStartDate");
        if (coverageStartDate == null) {
            coverageStartDate = getStringOrNull(root, "policyStartDate");
        }
        String coverageEndDate = getStringOrNull(root, "coverageEndDate");
        if (coverageEndDate == null) {
            coverageEndDate = getStringOrNull(root, "policyEndDate");
        }

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("insurerName", insurerName != null ? insurerName : getStringOrNull(root, "insuranceProvider"));
        extraFields.put("policyNumber", getStringOrNull(root, "policyNumber"));
        extraFields.put("policyType", policyType);
        extraFields.put("premiumAmountZar", premiumAmount);
        extraFields.put("monthlyPremiumZar", premiumAmount);
        extraFields.put("coverageStartDate", coverageStartDate);
        extraFields.put("coverageEndDate", coverageEndDate);
        extraFields.put("excessAmountZar", getBigDecimalOrNull(root, "excessAmountZar"));
        extraFields.put("odometerReading", getIntOrNull(root, "odometerReading"));
        extraFields.put("odometerReadingDate", getStringOrNull(root, "odometerReadingDate"));
        extraFields.put("brokerName", getStringOrNull(root, "brokerName"));
        extraFields.put("brokerPhone", getStringOrNull(root, "brokerPhone"));
        extraFields.put("claimPhoneNumber", getStringOrNull(root, "claimPhoneNumber"));
        extraFields.put("coverDetails", getStringOrNull(root, "coverDetails"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated insurance premium expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateTrackingExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.VEHICLE_TRACKING) {
            throw new ValidationException("Expense is not a Vehicle Tracking expense");
        }

        // Extract key tracking fields up-front
        String providerName = getStringOrNull(root, "providerName");
        if (providerName == null) {
            // Backward compatibility for older payloads
            providerName = getStringOrNull(root, "trackingProvider");
        }
        String subscriptionType = getStringOrNull(root, "subscriptionType");

        // Update basic scalar fields
        BigDecimal monthlyFee = getBigDecimalOrNull(root, "monthlyFeeZar");
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (monthlyFee != null) {
            // For vehicle tracking, treat the monthly fee as the primary amount
            existing.setAmountZar(monthlyFee);
        } else if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        // Keep supplierName in sync with providerName so list views show the edited provider
        if (providerName != null) {
            existing.setSupplierName(providerName);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        // Update description if explicitly provided, otherwise regenerate a sensible default
        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Vehicle Tracking");
        } else if (providerName != null) {
            StringBuilder desc = new StringBuilder("Vehicle Tracking: ").append(providerName);
            if (subscriptionType != null) {
                desc.append(" - ").append(subscriptionType);
            }
            existing.setDescription(desc.toString());
        }

        Integer odometerReading = getIntOrNull(root, "odometerReading");
        existing.setOdometerReading(odometerReading);

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("providerName", providerName);
        extraFields.put("subscriptionType", subscriptionType);
        extraFields.put("monthlyFeeZar", getBigDecimalOrNull(root, "monthlyFeeZar"));
        extraFields.put("subscriptionStartDate", getStringOrNull(root, "subscriptionStartDate"));
        extraFields.put("subscriptionEndDate", getStringOrNull(root, "subscriptionEndDate"));
        extraFields.put("deviceSerialNumber", getStringOrNull(root, "deviceSerialNumber"));
        extraFields.put("deviceType", getStringOrNull(root, "deviceType"));
        extraFields.put("installationDate", getStringOrNull(root, "installationDate"));
        extraFields.put("installationFeeZar", getBigDecimalOrNull(root, "installationFeeZar"));
        extraFields.put("contractDurationMonths", getIntOrNull(root, "contractDurationMonths"));
        extraFields.put("recoveryIncluded", getBooleanOrNull(root, "recoveryIncluded"));
        extraFields.put("odometerReading", getIntOrNull(root, "odometerReading"));
        extraFields.put("odometerReadingDate", getStringOrNull(root, "odometerReadingDate"));
        extraFields.put("appLoginEmail", getStringOrNull(root, "appLoginEmail"));
        extraFields.put("supportPhone", getStringOrNull(root, "supportPhone"));
        extraFields.put("features", getStringOrNull(root, "features"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated vehicle tracking expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateLicenseRenewalExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.LICENSE_RENEWAL) {
            throw new ValidationException("Expense is not a License Renewal expense");
        }

        // Derive amount from either the generic amount or the renewal-specific fee
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "renewalFeeZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        // Use newExpiryDate for expense_date, not renewal date
        if (root.has("newExpiryDate") && !root.get("newExpiryDate").isNull()) {
            String rawDate = root.get("newExpiryDate").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        } else if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        String registrationAuthority = getStringOrNull(root, "registrationAuthority");
        if (registrationAuthority == null) {
            registrationAuthority = getStringOrNull(root, "issuingAuthority");
        }

        if (registrationAuthority != null) {
            existing.setSupplierName(registrationAuthority);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "License Renewal");
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        Integer odometerReading = getIntOrNull(root, "odometerReading");
        existing.setOdometerReading(odometerReading);

        String renewalDate = getStringOrNull(root, "date");
        String newExpiryDate = getStringOrNull(root, "newExpiryDate");
        if (newExpiryDate == null) {
            newExpiryDate = getStringOrNull(root, "expiryDate");
        }

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("licenseNumber", getStringOrNull(root, "licenseNumber"));
        extraFields.put("licenseType", getStringOrNull(root, "licenseType"));
        extraFields.put("renewalDate", renewalDate);
        extraFields.put("registrationAuthority", registrationAuthority);
        extraFields.put("issuingAuthority", registrationAuthority);
        extraFields.put("previousExpiryDate", getStringOrNull(root, "previousExpiryDate"));
        extraFields.put("newExpiryDate", newExpiryDate);
        extraFields.put("expiryDate", newExpiryDate);
        extraFields.put("renewalFeeZar", getBigDecimalOrNull(root, "renewalFeeZar"));
        extraFields.put("penaltiesZar", getBigDecimalOrNull(root, "penaltiesZar"));
        extraFields.put("arrearsZar", getBigDecimalOrNull(root, "arrearsZar"));
        extraFields.put("transactionNumber", getStringOrNull(root, "transactionNumber"));
        extraFields.put("renewalMethod", getStringOrNull(root, "renewalMethod"));
        extraFields.put("processingDays", getIntOrNull(root, "processingDays"));
        extraFields.put("odometerReading", getIntOrNull(root, "odometerReading"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated license renewal expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateRoadworthyExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.ROADWORTHY) {
            throw new ValidationException("Expense is not a Roadworthy Certificate expense");
        }

        // Derive amount from either the generic amount or the roadworthy test fee
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "testFeeZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Roadworthy Certificate");
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        Integer vehicleOdometer = getIntOrNull(root, "vehicleOdometer");
        existing.setOdometerReading(vehicleOdometer);

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("testingStationName", getStringOrNull(root, "testingStationName"));
        extraFields.put("testingStationAddress", getStringOrNull(root, "testingStationAddress"));
        extraFields.put("testingStationPhone", getStringOrNull(root, "testingStationPhone"));
        extraFields.put("testDate", getStringOrNull(root, "testDate"));
        extraFields.put("expiryDate", getStringOrNull(root, "expiryDate"));
        extraFields.put("testResult", getStringOrNull(root, "testResult"));
        extraFields.put("certificateNumber", getStringOrNull(root, "certificateNumber"));
        extraFields.put("testFeeZar", getBigDecimalOrNull(root, "testFeeZar"));
        extraFields.put("retestFeeZar", getBigDecimalOrNull(root, "retestFeeZar"));
        extraFields.put("inspectorName", getStringOrNull(root, "inspectorName"));
        extraFields.put("vehicleOdometer", vehicleOdometer);
        extraFields.put("odometerReading", vehicleOdometer);
        extraFields.put("vehicleRegistration", getStringOrNull(root, "vehicleRegistration"));
        extraFields.put("failureReasons", getStringOrNull(root, "failureReasons"));
        extraFields.put("conditionsApplied", getStringOrNull(root, "conditionsApplied"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated roadworthy expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updatePersonalLicenseExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.PERSONAL_LICENSE) {
            throw new ValidationException("Expense is not a Personal License expense");
        }

        // Derive amount from either the generic amount or the renewal-specific fee
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "renewalFeeZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Personal License");
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("licenseType", getStringOrNull(root, "licenseType"));
        extraFields.put("licenseNumber", getStringOrNull(root, "licenseNumber"));
        extraFields.put("licenseCode", getStringOrNull(root, "licenseCode"));
        extraFields.put("issueDate", getStringOrNull(root, "issueDate"));
        extraFields.put("expiryDate", getStringOrNull(root, "expiryDate"));
        extraFields.put("renewalFeeZar", getBigDecimalOrNull(root, "renewalFeeZar"));
        extraFields.put("penaltiesZar", getBigDecimalOrNull(root, "penaltiesZar"));
        extraFields.put("renewalMethod", getStringOrNull(root, "renewalMethod"));
        extraFields.put("issuingAuthority", getStringOrNull(root, "issuingAuthority"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated personal license expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateCarWashExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.CAR_WASH) {
            throw new ValidationException("Expense is not a Car Wash expense");
        }

        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "costZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        String washName = getStringOrNull(root, "washName");
        if (washName != null) {
            existing.setSupplierName(washName);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Car Wash");
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        CarWash carWash = carWashRepository.findByExpenseId(id)
                .orElseGet(() -> CarWash.builder()
                        .expense(existing)
                        .interiorCleaned(false)
                        .exteriorCleaned(true)
                        .engineCleaned(false)
                        .build());

        String washType = getStringOrNull(root, "washType");
        if (washType != null) {
            carWash.setWashType(CarWashType.valueOf(washType));
        }
        carWash.setWashName(washName != null ? washName : existing.getSupplierName());
        carWash.setWashLocation(getStringOrNull(root, "location") != null
                ? getStringOrNull(root, "location")
                : getStringOrNull(root, "washLocation"));
        carWash.setNotes(getStringOrNull(root, "notes"));

        Expense saved = expenseRepository.save(existing);
        carWash.setExpense(saved);
        carWashRepository.save(carWash);

        log.info("Updated car wash expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateMechanicExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.MECHANIC_SERVICE) {
            throw new ValidationException("Expense is not a Mechanic Service expense");
        }

        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "totalCostZar");
        }
        if (amount == null) {
            BigDecimal laborCost = getBigDecimalOrNull(root, "laborCostZar");
            BigDecimal partsCost = getBigDecimalOrNull(root, "partsCostZar");
            if (laborCost != null || partsCost != null) {
                amount = (laborCost != null ? laborCost : BigDecimal.ZERO)
                        .add(partsCost != null ? partsCost : BigDecimal.ZERO);
            }
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        String workshopName = getStringOrNull(root, "workshopName");
        if (workshopName != null) {
            existing.setSupplierName(workshopName);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Mechanic Service");
        }

        if (root.has("odometerReading") && !root.get("odometerReading").isNull()) {
            existing.setOdometerReading(root.get("odometerReading").asInt());
        }

        if (root.has("invoiceNumber")) {
            existing.setInvoiceNumber(getStringOrNull(root, "invoiceNumber"));
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("glassProvider", getStringOrNull(root, "glassProvider"));
        extraFields.put("excessAmountZar", getBigDecimalOrNull(root, "excessAmountZar"));
        extraFields.put("notes", getStringOrNull(root, "notes"));
        existing.setExtraFields(extraFields.toString());

        MechanicService mechanicService = mechanicServiceRepository.findByExpenseId(id)
                .orElseGet(() -> MechanicService.builder().expense(existing).build());

        String serviceType = getStringOrNull(root, "serviceType");
        if (serviceType != null) {
            mechanicService.setServiceType(ServiceType.valueOf(serviceType));
        }
        if (workshopName != null) {
            mechanicService.setWorkshopName(workshopName);
        }
        mechanicService.setWorkDescription(getStringOrNull(root, "workDescription"));
        mechanicService.setLaborCostZar(getBigDecimalOrNull(root, "laborCostZar"));
        mechanicService.setPartsCostZar(getBigDecimalOrNull(root, "partsCostZar"));

        Expense saved = expenseRepository.save(existing);
        mechanicService.setExpense(saved);
        mechanicServiceRepository.save(mechanicService);

        log.info("Updated mechanic expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateTyreExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.TIRES) {
            throw new ValidationException("Expense is not a Tyre expense");
        }

        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "priceZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        String supplier = getStringOrNull(root, "supplier");
        if (supplier != null) {
            existing.setSupplierName(supplier);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Tyre Purchase");
        }

        if (root.has("odometerReading") && !root.get("odometerReading").isNull()) {
            existing.setOdometerReading(root.get("odometerReading").asInt());
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        Tyre tyre = tyreRepository.findByExpenseId(id)
                .orElseGet(() -> Tyre.builder().expense(existing).quantity(1).rotationIntervalKm(8000).build());

        if (root.has("brand") && !root.get("brand").isNull()) {
            tyre.setBrand(root.get("brand").asText());
        }
        if (root.has("model")) {
            tyre.setModel(getStringOrNull(root, "model"));
        }
        if (root.has("size")) {
            tyre.setSize(getStringOrNull(root, "size"));
        }
        if (root.has("quantity") && !root.get("quantity").isNull()) {
            tyre.setQuantity(root.get("quantity").asInt());
        }
        if (root.has("position")) {
            tyre.setPosition(getStringOrNull(root, "position"));
        }
        if (root.has("odometerReading") && !root.get("odometerReading").isNull()) {
            tyre.setPurchaseOdometer(root.get("odometerReading").asInt());
        }
        if (root.has("expectedLifespanKm") && !root.get("expectedLifespanKm").isNull()) {
            tyre.setExpectedLifespanKm(root.get("expectedLifespanKm").asInt());
        }
        if (root.has("warrantyKm") && !root.get("warrantyKm").isNull()) {
            tyre.setWarrantyKm(root.get("warrantyKm").asInt());
        } else if (root.has("warrantyKm") && root.get("warrantyKm").isNull()) {
            tyre.setWarrantyKm(null);
        }
        if (root.has("notes")) {
            tyre.setNotes(getStringOrNull(root, "notes"));
        }

        // Handle rotation tracking
        Boolean enableRotationTracking = root.has("enableRotationTracking") 
            ? root.get("enableRotationTracking").asBoolean() 
            : null;
        String drivetrainTypeStr = getStringOrNull(root, "drivetrainType");

        Expense saved = expenseRepository.save(existing);
        tyre.setExpense(saved);
        tyreRepository.save(tyre);

        // Update rotation tracking based on user preference
        if (enableRotationTracking != null) {
            if (enableRotationTracking) {
                // User wants rotation tracking enabled
                za.co.fleetexpense.entity.enums.DrivetrainType drivetrainType = null;
                if (drivetrainTypeStr != null && !drivetrainTypeStr.isEmpty()) {
                    try {
                        drivetrainType = za.co.fleetexpense.entity.enums.DrivetrainType.valueOf(drivetrainTypeStr);
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid drivetrain type: {}, using vehicle default", drivetrainTypeStr);
                    }
                }
                
                TyreRotationTracking tracking = tyreRotationTrackingRepository.findByTyreExpenseId(saved.getId())
                    .orElseGet(() -> TyreRotationTracking.builder()
                        .organization(saved.getOrganization())
                        .vehicle(saved.getVehicle())
                        .tyreExpense(saved)
                        .build());
                
                tracking.setIsActive(true);
                tracking.setIsDismissed(false);
                if (drivetrainType != null) {
                    tracking.setDrivetrainType(drivetrainType);
                } else if (tracking.getDrivetrainType() == null && saved.getVehicle() != null) {
                    tracking.setDrivetrainType(saved.getVehicle().getDrivetrainType());
                }
                
                Integer installationOdometer = tyre.getPurchaseOdometer() != null 
                    ? tyre.getPurchaseOdometer() 
                    : saved.getOdometerReading();
                tracking.setInstallationOdometer(installationOdometer);
                
                // Always calculate rotation interval based on drivetrain type when tracking is enabled
                Integer rotationIntervalKm;
                if (drivetrainType != null) {
                    rotationIntervalKm = switch (drivetrainType) {
                        case FWD -> 8000;
                        case RWD -> 10000;
                        case AWD -> 6000;
                        case FOUR_BY_FOUR -> 6000;
                        default -> 8000;
                    };
                } else {
                    rotationIntervalKm = tyre.getRotationIntervalKm() != null ? tyre.getRotationIntervalKm() : 8000;
                }
                tracking.setRotationIntervalKm(rotationIntervalKm);
                
                if (tracking.getLastRotationOdometer() != null) {
                    tracking.setNextRotationOdometer(tracking.getLastRotationOdometer() + tracking.getRotationIntervalKm());
                } else {
                    tracking.setNextRotationOdometer(installationOdometer + tracking.getRotationIntervalKm());
                }
                
                tyreRotationTrackingRepository.save(tracking);
                log.info("Enabled rotation tracking for tyre expense {}", id);
            } else {
                // User wants rotation tracking disabled
                tyreRotationTrackingRepository.findByTyreExpenseId(saved.getId()).ifPresent(tracking -> {
                    tracking.setIsActive(false);
                    tyreRotationTrackingRepository.save(tracking);
                    log.info("Disabled rotation tracking for tyre expense {}", id);
                });
            }
        } else {
            // No change requested, use default behavior
            tyreRotationService.ensureTrackingForTyreExpense(saved.getId());
        }

        log.info("Updated tyre expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateMaintenanceExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        if (existing.getCategory() != ExpenseCategory.MAINTENANCE_TOPUP) {
            throw new ValidationException("Expense is not a Maintenance Top-up expense");
        }

        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "priceZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        String shopName = getStringOrNull(root, "shopName");
        if (shopName != null) {
            existing.setSupplierName(shopName);
        } else if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Maintenance Top-up");
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        MaintenanceTopup maintenanceTopup = maintenanceTopupRepository.findByExpenseId(id)
                .orElseGet(() -> MaintenanceTopup.builder().expense(existing).itemQuantity(BigDecimal.ONE).build());

        String itemType = getStringOrNull(root, "itemType");
        if (itemType != null) {
            maintenanceTopup.setItemType(MaintenanceItemType.valueOf(itemType));
        }
        maintenanceTopup.setItemBrand(getStringOrNull(root, "itemBrand"));
        if (root.has("itemQuantity") && !root.get("itemQuantity").isNull()) {
            maintenanceTopup.setItemQuantity(new BigDecimal(root.get("itemQuantity").asText()));
        }
        maintenanceTopup.setShopName(shopName != null ? shopName : existing.getSupplierName());
        maintenanceTopup.setNotes(getStringOrNull(root, "notes"));

        Expense saved = expenseRepository.save(existing);
        maintenanceTopup.setExpense(saved);
        maintenanceTopupRepository.save(maintenanceTopup);

        log.info("Updated maintenance expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO updateOtherFixedExpense(UUID id, JsonNode root) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        // Allow only OTHER_FIXED category
        if (existing.getCategory() != ExpenseCategory.OTHER_FIXED) {
            throw new ValidationException("Expense is not an Other Fixed expense");
        }

        // Support both 'amount' (original API) and 'amountZar' (form field) for edits
        BigDecimal amount = getBigDecimalOrNull(root, "amount");
        if (amount == null) {
            amount = getBigDecimalOrNull(root, "amountZar");
        }
        if (amount != null) {
            existing.setAmountZar(amount);
        }

        if (root.has("date") && !root.get("date").isNull()) {
            String rawDate = root.get("date").asText();
            String dateOnly = rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate;
            existing.setExpenseDate(LocalDate.parse(dateOnly));
        }

        if (root.has("supplierName")) {
            existing.setSupplierName(getStringOrNull(root, "supplierName"));
        }

        if (root.has("description")) {
            String description = getStringOrNull(root, "description");
            existing.setDescription(description != null ? description : "Other Expense");
        }

        if (existing.getAmountZar() != null) {
            existing.setVatAmountZar(existing.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        ObjectNode extraFields = objectMapper.createObjectNode();
        extraFields.put("categoryLabel", getStringOrNull(root, "categoryLabel"));
        extraFields.put("referenceNumber", getStringOrNull(root, "referenceNumber"));
        // Store recurrence flags and period information if present
        if (root.has("isRecurring") && !root.get("isRecurring").isNull()) {
            extraFields.put("isRecurring", root.get("isRecurring").asBoolean());
        }
        extraFields.put("recurrenceFrequency", getStringOrNull(root, "recurrenceFrequency"));
        
        // Add recurrence days of week
        if (root.has("recurrenceDaysOfWeek") && !root.get("recurrenceDaysOfWeek").isNull()) {
            extraFields.put("recurrenceDaysOfWeek", root.get("recurrenceDaysOfWeek"));
        }
        
        // Add recurrence days of month
        if (root.has("recurrenceDaysOfMonth") && !root.get("recurrenceDaysOfMonth").isNull()) {
            extraFields.put("recurrenceDaysOfMonth", root.get("recurrenceDaysOfMonth"));
        }
        
        extraFields.put("periodStartDate", getStringOrNull(root, "periodStartDate"));
        extraFields.put("periodEndDate", getStringOrNull(root, "periodEndDate"));
        extraFields.put("notes", getStringOrNull(root, "notes"));

        existing.setExtraFields(extraFields.toString());

        Expense saved = expenseRepository.save(existing);
        log.info("Updated other fixed expense {}", id);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO create(ExpenseCreateRequest request, UUID organizationId, UUID userId) {
        if (request.getCategory() != ExpenseCategory.PERSONAL_LICENSE && request.getVehicleId() == null) {
            throw new ValidationException("Vehicle ID is required for category: " + request.getCategory());
        }

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Vehicle vehicle = null;
        // Only find vehicle if vehicleId is not null (for expenses that require vehicle association)
        if (request.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(request.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

            // Verify vehicle belongs to organization
            if (!vehicle.getOrganization().getId().equals(organizationId)) {
                throw new ValidationException("Vehicle does not belong to this organization");
            }
        }

        // Map request to entity
        Expense expense = expenseMapper.toEntity(request);
        expense.setOrganization(organization);
        expense.setUser(user);
        expense.setVehicle(vehicle);

        // Phase 1: Derive tax classification if not provided
        if (expense.getTaxExpenseClassification() == null) {
            expense.setTaxExpenseClassification(deriveTaxClassification(request.getCategory()));
        }

        // Validate odometer reading is not lower than current vehicle odometer (stored baseline)
        // Only applies to LICENSE_RENEWAL since insurance/tracking can have different readings
        if (vehicle != null && request.getOdometerReading() != null && request.getCategory() == ExpenseCategory.LICENSE_RENEWAL) {
            if (vehicle.getCurrentOdometerStored() != null && request.getOdometerReading() < vehicle.getCurrentOdometerStored()) {
                throw new ValidationException("Cannot save with a lower odometer reading. " +
                    "Current vehicle odometer is " + vehicle.getCurrentOdometerStored() + " km, " +
                    "but you entered " + request.getOdometerReading() + " km. " +
                    "Please go back and enter the correct odometer reading.");
            }
        }

        // Calculate VAT if not provided (15% for South Africa)
        if (expense.getVatAmountZar() == null && expense.getAmountZar() != null) {
            expense.setVatAmountZar(expense.getAmountZar().multiply(BigDecimal.valueOf(0.15)));
        }

        Expense saved = expenseRepository.save(expense);
        log.info("Created expense {} for organization {}", saved.getId(), organizationId);
        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public ExpenseDTO update(UUID id, ExpenseUpdateRequest request) {
        Expense existing = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked expense");
        }

        // Validate odometer reading is not lower than current vehicle odometer (stored baseline)
        if (existing.getVehicle() != null && request.getOdometerReading() != null) {
            if (existing.getVehicle().getCurrentOdometerStored() != null && request.getOdometerReading() < existing.getVehicle().getCurrentOdometerStored()) {
                throw new ValidationException("Cannot save with a lower odometer reading. " +
                    "Current vehicle odometer is " + existing.getVehicle().getCurrentOdometerStored() + " km, " +
                    "but you entered " + request.getOdometerReading() + " km. " +
                    "Please go back and enter the correct odometer reading.");
            }
        }

        // Apply updates using mapper
        expenseMapper.updateEntity(existing, request);

        // Phase 1: Handle tax expense classification
        // If request provides a classification, user explicitly changed it — use it
        if (request.getTaxExpenseClassification() != null) {
            existing.setTaxExpenseClassification(request.getTaxExpenseClassification());
        } else if (existing.getTaxExpenseClassification() == null && request.getCategory() != null) {
            // Only derive when there is no existing value at all
            existing.setTaxExpenseClassification(deriveTaxClassification(request.getCategory()));
        }
        // Otherwise: preserve existing classification untouched

        Expense saved = expenseRepository.save(existing);
        log.info("Updated expense {}", id);

        // Check for odometer drift after update (only if odometer reading changed)
        if (existing.getVehicle() != null && request.getOdometerReading() != null) {
            odometerDriftAlertService.checkAndCreateAlert(existing.getVehicle().getId());
            mechanicServiceAlertService.checkVehicleAlerts(existing.getVehicle().getId());
        }

        return expenseMapper.toDTO(saved);
    }

    @Transactional
    public void delete(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (Boolean.TRUE.equals(expense.getIsLocked())) {
            throw new ValidationException("Cannot delete locked expense");
        }

        UUID vehicleId = expense.getVehicle() != null ? expense.getVehicle().getId() : null;

        // Dismiss any alerts linked to this expense before deletion
        try {
            // Dismiss alerts for all possible ExpiryItemType values that could be linked to this expense
            // This covers cases where item_type differs from expense category (e.g., MECHANIC_SERVICE, TYRE_ROTATION)
            za.co.fleetexpense.entity.enums.ExpiryItemType[] allItemTypes = za.co.fleetexpense.entity.enums.ExpiryItemType.values();
            
            for (za.co.fleetexpense.entity.enums.ExpiryItemType itemType : allItemTypes) {
                List<ExpiryAlert> alerts = expiryAlertRepository.findByItemTypeAndItemId(itemType.name(), id);
                for (ExpiryAlert alert : alerts) {
                    if (!alert.getIsDismissed()) {
                        alert.setIsDismissed(true);
                        alert.setUpdatedAt(java.time.OffsetDateTime.now());
                        expiryAlertRepository.save(alert);
                        log.info("Dismissed alert {} (item_type: {}) for deleted expense {}", alert.getId(), itemType, id);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to dismiss alerts for deleted expense {}: {}", id, e.getMessage());
        }

        expenseRepository.delete(expense);
        log.info("Deleted expense {}", id);

        // Check for odometer drift after deletion
        if (vehicleId != null) {
            odometerDriftAlertService.checkAndCreateAlert(vehicleId);
            mechanicServiceAlertService.checkVehicleAlerts(vehicleId);
        }
    }

    @Transactional
    public ExpenseDTO toggleLock(UUID id, boolean locked, UUID userId, String reason) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        expense.setIsLocked(locked);
        if (locked) {
            expense.setLockedAt(java.time.OffsetDateTime.now());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            expense.setLockedByUser(user);
            expense.setLockedReason(reason);
        } else {
            expense.setLockedAt(null);
            expense.setLockedByUser(null);
            expense.setLockedReason(null);
        }

        Expense saved = expenseRepository.save(expense);
        log.info("{} expense {}", locked ? "Locked" : "Unlocked", id);
        return expenseMapper.toDTO(saved);
    }

    // ==================== BUSINESS LOGIC METHODS ====================

    /**
     * Get total expenses for an organization within a date range
     */
    public BigDecimal getTotalExpenses(UUID organizationId, LocalDate startDate, LocalDate endDate, UUID userId, UserRole role, OrganizationMode organizationMode) {
        List<Expense> expenses;
        if (role == UserRole.DRIVER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndDateRange(organizationId, userId, startDate, endDate);
        } else {
            expenses = expenseRepository.findByOrganizationIdAndDateRange(organizationId, startDate, endDate);
        }
        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .map(Expense::getAmountZar)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get expense breakdown by category for an organization
     */
    public Map<ExpenseCategory, BigDecimal> getExpensesByCategory(UUID organizationId, LocalDate startDate, LocalDate endDate, UUID userId, UserRole role, OrganizationMode organizationMode) {
        List<Expense> expenses;
        if (role == UserRole.DRIVER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndDateRange(organizationId, userId, startDate, endDate);
        } else {
            expenses = expenseRepository.findByOrganizationIdAndDateRange(organizationId, startDate, endDate);
        }
        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmountZar, BigDecimal::add)
                ));
    }

    /**
     * Get monthly expense summary for an organization
     */
    public Map<String, BigDecimal> getMonthlySummary(UUID organizationId, int year, UUID userId, UserRole role, OrganizationMode organizationMode) {
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        LocalDate endOfYear = LocalDate.of(year, 12, 31);

        List<Expense> expenses;
        if (role == UserRole.DRIVER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndDateRange(organizationId, userId, startOfYear, endOfYear);
        } else {
            expenses = expenseRepository.findByOrganizationIdAndDateRange(organizationId, startOfYear, endOfYear);
        }

        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .collect(Collectors.groupingBy(
                        expense -> expense.getExpenseDate().getMonth().toString(),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmountZar, BigDecimal::add)
                ));
    }

    /**
     * Calculate average expense amount by category
     */
    public Map<ExpenseCategory, BigDecimal> getAverageExpenseByCategory(UUID organizationId, UUID userId, UserRole role, OrganizationMode organizationMode) {
        List<Expense> expenses;
        if (role == UserRole.DRIVER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdOrderByExpenseDateDesc(organizationId, userId);
        } else {
            expenses = expenseRepository.findByOrganizationIdOrderByExpenseDateDesc(organizationId);
        }

        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    BigDecimal sum = list.stream()
                                            .map(Expense::getAmountZar)
                                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                                    return sum.divide(BigDecimal.valueOf(list.size()), 2, RoundingMode.HALF_UP);
                                }
                        )
                ));
    }

    /**
     * Get tax deductible expenses total for tax year calculation
     */
    public BigDecimal getTaxDeductibleTotal(UUID organizationId, int taxYear, UUID userId, UserRole role, OrganizationMode organizationMode) {
        LocalDate startOfYear = LocalDate.of(taxYear, 1, 1);
        LocalDate endOfYear = LocalDate.of(taxYear, 12, 31);

        List<Expense> expenses;
        if (role == UserRole.DRIVER) {
            expenses = expenseRepository.findByOrganizationIdAndUserIdAndDateRange(organizationId, userId, startOfYear, endOfYear);
        } else {
            expenses = expenseRepository.findByOrganizationIdAndDateRange(organizationId, startOfYear, endOfYear);
        }

        return expenses.stream()
                .filter(expense -> shouldIncludeExpenseForRole(expense, role, organizationMode))
                .filter(expense -> Boolean.TRUE.equals(expense.getIsTaxDeductible()))
                .map(Expense::getAmountZar)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Check if expense amount exceeds threshold and might need review
     */
    public boolean requiresReview(UUID expenseId, BigDecimal threshold) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        return expense.getAmountZar().compareTo(threshold) > 0;
    }

    /**
     * Get distinct categoryLabel values used in OTHER_FIXED expenses for an organization.
     * These are used for the recurring expense system and dropdown suggestions.
     */
    @Transactional(readOnly = true)
    public List<String> getDistinctCategoryLabels(UUID organizationId) {
        List<Expense> otherFixedExpenses = expenseRepository.findByOrganizationIdAndCategoryOrderByExpenseDateDesc(
                organizationId, ExpenseCategory.OTHER_FIXED);
        
        return otherFixedExpenses.stream()
                .filter(expense -> expense.getExtraFields() != null && !expense.getExtraFields().isBlank())
                .map(expense -> {
                    try {
                        JsonNode extraFields = objectMapper.readTree(expense.getExtraFields());
                        String categoryLabel = getStringOrNull(extraFields, "categoryLabel");
                        return categoryLabel;
                    } catch (Exception e) {
                        log.warn("Failed to parse extraFields for expense {}: {}", expense.getId(), e.getMessage());
                        return null;
                    }
                })
                .filter(label -> label != null && !label.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }
}
