package za.co.fleetexpense.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.*;
import za.co.fleetexpense.entity.CarWash;
import za.co.fleetexpense.entity.MaintenanceTopup;
import za.co.fleetexpense.entity.MechanicService;
import za.co.fleetexpense.entity.Tyre;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.CarWashType;
import za.co.fleetexpense.entity.enums.EntryType;
import za.co.fleetexpense.entity.enums.ExpiryItemType;
import za.co.fleetexpense.entity.enums.ExpenseCategory;
import za.co.fleetexpense.entity.enums.MaintenanceItemType;
import za.co.fleetexpense.entity.enums.ServiceType;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.CarWashService;
import za.co.fleetexpense.service.EntryImageService;
import za.co.fleetexpense.service.ExpiryAlertService;
import za.co.fleetexpense.service.ExpenseService;
import za.co.fleetexpense.service.FuelLogService;
import za.co.fleetexpense.service.MaintenanceTopupService;
import za.co.fleetexpense.service.MechanicServiceAlertService;
import za.co.fleetexpense.service.MechanicServiceService;
import za.co.fleetexpense.service.TyreRotationService;
import za.co.fleetexpense.service.TyreService;
import za.co.fleetexpense.repository.ExpenseRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.mapper.ExpenseMapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@Slf4j
public class ExpenseController {

    private final ExpenseService expenseService;
    private final FuelLogService fuelLogService;
    private final TyreService tyreService;
    private final TyreRotationService tyreRotationService;
    private final CarWashService carWashService;
    private final MaintenanceTopupService maintenanceTopupService;
    private final MechanicServiceService mechanicServiceService;
    private final MechanicServiceAlertService mechanicServiceAlertService;
    private final EntryImageService entryImageService;
    private final ExpiryAlertService expiryAlertService;
    private final ObjectMapper objectMapper;
    private final ExpenseRepository expenseRepository;
    private final VehicleRepository vehicleRepository;
    private final ExpenseMapper expenseMapper;

    // ==================== CRUD OPERATIONS ====================

    /**
     * Get distinct categoryLabel values used in OTHER_FIXED expenses for dropdown suggestions.
     * These are used for the recurring expense system.
     */
    @GetMapping("/category-labels")
    public ResponseEntity<List<String>> getDistinctCategoryLabels(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID orgId = principal.getOrganizationId();
        List<String> categoryLabels = expenseService.getDistinctCategoryLabels(orgId);
        return ResponseEntity.ok(categoryLabels);
    }

    @GetMapping
    public ResponseEntity<List<ExpenseDTO>> getAllExpenses(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(required = false) UUID vehicleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        UUID orgId = principal.getOrganizationId();
        UUID userId = principal.getUserId();
        UserRole role = principal.getRole();
        var organizationMode = principal.getOrganizationMode();

        log.info("GET /expenses - orgId: {}, userId: {}, role: {}, organizationMode: {}, category: {}, vehicleId: {}, startDate: {}, endDate: {}",
                orgId, userId, role, organizationMode, category, vehicleId, startDate, endDate);

        List<ExpenseDTO> result;
        if (category != null) {
            result = expenseService.getByCategory(orgId, category, userId, role, organizationMode);
        } else if (vehicleId != null) {
            result = expenseService.getByVehicle(orgId, vehicleId, userId, role, organizationMode);
        } else if (startDate != null && endDate != null) {
            result = expenseService.getByDateRange(orgId, startDate, endDate, userId, role, organizationMode);
        } else {
            result = expenseService.getAllByOrganization(orgId, userId, role, organizationMode);
        }

        log.info("Returning {} expenses for orgId: {}", result.size(), orgId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getExpenseCategories(@AuthenticationPrincipal UserPrincipal principal) {
        UUID orgId = principal.getOrganizationId();
        UserRole role = principal.getRole();
        var organizationMode = principal.getOrganizationMode();
        List<String> categories = expenseService.getAvailableCategories(orgId, role, organizationMode);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/missing-receipts")
    public ResponseEntity<List<ExpenseDTO>> getExpensesWithoutReceipts(
            @AuthenticationPrincipal UserPrincipal principal) {

        List<za.co.fleetexpense.entity.Expense> expenses = expenseRepository.findExpensesWithoutReceiptImages(principal.getOrganizationId());
        List<ExpenseDTO> dtos = expenses.stream()
                .map(expenseMapper::toDTO)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}")
    public ResponseEntity<ExpenseDTO> getExpenseById(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expenseService.getById(id, principal.getUserId(), principal.getRole(), principal.getOrganizationMode()));
    }

    @GetMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}/images")
    public ResponseEntity<List<za.co.fleetexpense.entity.EntryImage>> getExpenseImages(@PathVariable UUID id) {
        return ResponseEntity.ok(entryImageService.getByEntry(EntryType.EXPENSE, id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createExpense(
            @Valid @RequestBody ExpenseCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        ExpenseDTO created = expenseService.create(request, principal.getOrganizationId(), principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Create a full fuel purchase: expense record + fuel log + consumption calculation
     * in a single multipart request. GPS coordinates are optional.
     */
    @PostMapping(value = "/fuel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<ExpenseDTO> createFuelExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            FuelExpenseCreateRequest req = objectMapper.readValue(dataJson, FuelExpenseCreateRequest.class);

            // 1. Create the parent expense
            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(req.getVehicleId());
            expenseReq.setCategory(ExpenseCategory.FUEL_LOG);
            expenseReq.setAmountZar(req.getAmountZar() != null ? req.getAmountZar() :
                    (req.getLiters() != null && req.getPricePerLiter() != null
                            ? req.getLiters().multiply(req.getPricePerLiter()) : BigDecimal.ZERO));
            expenseReq.setExpenseDate(req.getExpenseDate() != null ? req.getExpenseDate() : LocalDate.now());
            expenseReq.setSupplierName(req.getStationName() != null ? req.getStationName() : "Fuel Station");
            expenseReq.setDescription(req.getDescription() != null ? req.getDescription() :
                    (req.getStationName() != null ? "Fuel at " + req.getStationName() : "Fuel Purchase"));

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            // 2. Create fuel log linked to the expense
            FuelLogCreateRequest fuelLogReq = new FuelLogCreateRequest();
            fuelLogReq.setExpenseId(expense.getId());
            fuelLogReq.setVehicleId(req.getVehicleId());
            fuelLogReq.setFuelType(req.getFuelType());
            fuelLogReq.setLiters(req.getLiters());
            fuelLogReq.setPricePerLiter(req.getPricePerLiter());
            fuelLogReq.setFullTank(req.getFullTank());
            fuelLogReq.setStationName(req.getStationName());
            fuelLogReq.setStationLocation(req.getStationLocation());
            fuelLogReq.setOdometerReading(req.getOdometerReading());
            fuelLogReq.setIsBaselineFill(req.getIsBaselineFill());
            fuelLogReq.setGpsLatitude(req.getGpsLatitude());
            fuelLogReq.setGpsLongitude(req.getGpsLongitude());
            fuelLogReq.setGpsAccuracyMeters(req.getGpsAccuracyMeters());

            FuelLogDTO fuelLog = fuelLogService.create(fuelLogReq, principal.getUserId());

            uploadExpenseReceiptIfPresent(expense, receipt, "Fuel Receipt", principal);

            // 3. Trigger consumption calculation (also recalculates stats + fires alert detection)
            if (!Boolean.TRUE.equals(req.getIsBaselineFill())) {
                try {
                    fuelLogService.calculateConsumption(fuelLog.getId());
                } catch (Exception e) {
                    log.warn("Consumption calculation skipped for fuel log {}: {}", fuelLog.getId(), e.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create fuel expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update a fuel expense: expense record + fuel log in a single multipart request.
     * This endpoint is required by the frontend edit page for fuel expenses.
     */
    @PutMapping(value = "/fuel/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER','DRIVER')")
    public ResponseEntity<ExpenseDTO> updateFuelExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            FuelExpenseCreateRequest req = objectMapper.readValue(dataJson, FuelExpenseCreateRequest.class);
            log.info("Updating fuel expense {} with odometer reading: {}", id, req.getOdometerReading());

            // 1. Update the parent expense
            ExpenseUpdateRequest expenseReq = new ExpenseUpdateRequest();
            expenseReq.setAmountZar(req.getAmountZar() != null ? req.getAmountZar() :
                    (req.getLiters() != null && req.getPricePerLiter() != null
                            ? req.getLiters().multiply(req.getPricePerLiter()) : BigDecimal.ZERO));
            expenseReq.setExpenseDate(req.getExpenseDate() != null ? req.getExpenseDate() : LocalDate.now());
            expenseReq.setSupplierName(req.getStationName() != null ? req.getStationName() : "Fuel Station");
            expenseReq.setDescription(req.getDescription() != null ? req.getDescription() :
                    (req.getStationName() != null ? "Fuel at " + req.getStationName() : "Fuel Purchase"));
            expenseReq.setOdometerReading(req.getOdometerReading());
            // Don't allow vehicle changes during edit - vehicle is already set and should not be changed
            log.info("Expense update request - odometer reading: {}", expenseReq.getOdometerReading());

            ExpenseDTO expense = expenseService.update(id, expenseReq);

            // 2. Update the fuel log linked to the expense
            FuelLogDTO existingFuelLog = fuelLogService.getByExpenseId(id);
            if (existingFuelLog != null) {
                FuelLogUpdateRequest fuelLogReq = new FuelLogUpdateRequest();
                fuelLogReq.setFuelType(req.getFuelType());
                fuelLogReq.setLiters(req.getLiters());
                fuelLogReq.setPricePerLiter(req.getPricePerLiter());
                fuelLogReq.setFullTank(req.getFullTank());
                fuelLogReq.setStationName(req.getStationName());
                fuelLogReq.setStationLocation(req.getStationLocation());
                fuelLogReq.setOdometerReading(req.getOdometerReading());
                fuelLogReq.setGpsLatitude(req.getGpsLatitude());
                fuelLogReq.setGpsLongitude(req.getGpsLongitude());
                fuelLogReq.setGpsAccuracyMeters(req.getGpsAccuracyMeters());

                fuelLogService.update(existingFuelLog.getId(), fuelLogReq);

                // 3. Recalculate consumption after update
                try {
                    fuelLogService.calculateConsumption(existingFuelLog.getId());
                } catch (Exception e) {
                    log.warn("Consumption calculation skipped for fuel log {}: {}", existingFuelLog.getId(), e.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update fuel expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create a tyre purchase expense with tyre details
     */
    @PostMapping(value = "/tyres", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createTyreExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            // 1. Create the parent expense
            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.TIRES);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Tyre Purchase");
            expenseReq.setOdometerReading(getIntOrNull(root, "odometerReading"));

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            uploadExpenseReceiptIfPresent(expense, receipt, "Tyre Receipt", principal);

            // 2. Create tyre record linked to the expense (if tyre data provided)
            if (root.has("brand") || root.has("quantity")) {
                Tyre tyre = Tyre.builder()
                        .expense(new za.co.fleetexpense.entity.Expense())
                        .brand(root.has("brand") ? root.get("brand").asText() : null)
                        .model(root.has("model") ? root.get("model").asText() : null)
                        .size(root.has("size") ? root.get("size").asText() : null)
                        .quantity(root.has("quantity") ? root.get("quantity").asInt() : 1)
                        .position(root.has("position") ? root.get("position").asText() : null)
                        .purchaseOdometer(root.has("odometerReading") ? root.get("odometerReading").asInt() : null)
                        .treadDepthMm(root.has("treadDepthMm") ? new BigDecimal(root.get("treadDepthMm").asText()) : null)
                        .expectedLifespanKm(root.has("expectedLifespanKm") ? root.get("expectedLifespanKm").asInt() : null)
                        .rotationIntervalKm(root.has("rotationIntervalKm") ? root.get("rotationIntervalKm").asInt() : 8000)
                        .warrantyKm(root.has("warrantyKm") ? root.get("warrantyKm").asInt() : null)
                        .notes(root.has("notes") ? root.get("notes").asText() : null)
                        .build();
                tyre.getExpense().setId(expense.getId());
                tyreService.create(tyre);
                
                // Get drivetrain type from form data if provided
                za.co.fleetexpense.entity.enums.DrivetrainType drivetrainType = null;
                if (root.has("drivetrainType") && root.get("drivetrainType") != null && !root.get("drivetrainType").isNull()) {
                    try {
                        drivetrainType = za.co.fleetexpense.entity.enums.DrivetrainType.valueOf(root.get("drivetrainType").asText());
                        log.info("Drivetrain type from form data: {}", drivetrainType);
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid drivetrain type provided: {}", root.get("drivetrainType").asText());
                    }
                }
                
                // Check if rotation tracking is enabled
                boolean enableRotationTracking = root.has("enableRotationTracking") && root.get("enableRotationTracking").asBoolean();
                log.info("Enable rotation tracking from form: {}", enableRotationTracking);
                
                // Always ensure tracking exists (it will be inactive if rotation is disabled)
                tyreRotationService.ensureTrackingForTyreExpense(expense.getId(), drivetrainType, enableRotationTracking);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create tyre expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/tyres/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateTyreExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateTyreExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                uploadExpenseReceiptIfPresent(expense, receipt, "Tyre Receipt", principal);
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update tyre expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create insurance premium expense
     */
    @PostMapping(value = "/insurance", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createInsuranceExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @RequestParam(value = "odometerPhoto", required = false) MultipartFile odometerPhoto,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.INSURANCE_PREMIUM);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            String insurerName = getStringOrNull(root, "insurerName");
            if (insurerName == null) {
                insurerName = getStringOrNull(root, "insuranceProvider");
            }
            expenseReq.setSupplierName(insurerName != null ? insurerName : getStringOrNull(root, "supplierName"));
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Insurance Premium");
            expenseReq.setOdometerReading(getIntOrNull(root, "odometerReading"));

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
            BigDecimal premiumAmount = getBigDecimalOrNull(root, "monthlyPremiumZar");
            if (premiumAmount == null) {
                premiumAmount = getBigDecimalOrNull(root, "premiumAmountZar");
            }

            ObjectNode extraFields = createExtraFieldsObject();
            extraFields.put("insurerName", insurerName);
            extraFields.put("policyNumber", getStringOrNull(root, "policyNumber"));
            extraFields.put("policyType", policyType);
            extraFields.put("coverageStartDate", coverageStartDate);
            extraFields.put("coverageEndDate", coverageEndDate);
            extraFields.put("premiumAmountZar", premiumAmount);
            extraFields.put("monthlyPremiumZar", premiumAmount);
            extraFields.put("excessAmountZar", getBigDecimalOrNull(root, "excessAmountZar"));
            extraFields.put("odometerReading", getIntOrNull(root, "odometerReading"));
            extraFields.put("odometerReadingDate", getStringOrNull(root, "odometerReadingDate"));
            extraFields.put("brokerName", getStringOrNull(root, "brokerName"));
            extraFields.put("brokerPhone", getStringOrNull(root, "brokerPhone"));
            extraFields.put("claimPhoneNumber", getStringOrNull(root, "claimPhoneNumber"));
            extraFields.put("coverDetails", getStringOrNull(root, "coverDetails"));
            extraFields.put("notes", getStringOrNull(root, "notes"));

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());
            uploadExpenseReceiptIfPresent(expense, receipt, "Insurance Receipt", principal);
            
            // Upload odometer photo as separate entry image with type ODOMETER
            if (odometerPhoto != null && !odometerPhoto.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                        EntryType.EXPENSE,
                        expense.getId(),
                        odometerPhoto,
                        "Odometer Reading Proof",
                        principal.getOrganizationId(),
                        principal.getUserId(),
                        "ODOMETER"
                    );
                    log.info("Uploaded odometer photo for insurance expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to upload odometer photo for insurance expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            // Create insurance expiry alert if coverage end date is provided
            if (coverageEndDate != null && !coverageEndDate.isEmpty()) {
                try {
                    LocalDate expiryDate = LocalDate.parse(coverageEndDate.substring(0, 10));
                    expiryAlertService.createAlert(
                        principal.getOrganizationId(),
                        ExpiryItemType.INSURANCE.name(),
                        expense.getId(),
                        insurerName != null ? insurerName : "Insurance",
                        "Insurance policy coverage",
                        expenseReq.getVehicleId(),
                        null,
                        expiryDate
                    );
                    log.info("Created insurance expiry alert for expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to create insurance expiry alert for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create insurance expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create vehicle tracking expense
     */
    @PostMapping(value = "/tracking", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createTrackingExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @RequestParam(value = "odometerPhoto", required = false) MultipartFile odometerPhoto,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.VEHICLE_TRACKING);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Vehicle Tracking");
            expenseReq.setOdometerReading(getIntOrNull(root, "odometerReading"));

            // Create extra fields object for vehicle tracking specific data
            ObjectNode extraFields = createExtraFieldsObject();
            String providerName = getStringOrNull(root, "providerName");
            if (providerName == null) {
                providerName = getStringOrNull(root, "trackingProvider");
            }
            extraFields.put("providerName", providerName);
            extraFields.put("subscriptionType", getStringOrNull(root, "subscriptionType"));
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

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Tracking Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload tracking receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            // Upload odometer photo as separate entry image with type ODOMETER
            if (odometerPhoto != null && !odometerPhoto.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                        EntryType.EXPENSE,
                        expense.getId(),
                        odometerPhoto,
                        "Odometer Reading Proof",
                        principal.getOrganizationId(),
                        principal.getUserId(),
                        "ODOMETER"
                    );
                    log.info("Uploaded odometer photo for tracking expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to upload odometer photo for tracking expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            // Create tracking contract expiry alert if subscription end date is provided
            String subscriptionEndDate = getStringOrNull(root, "subscriptionEndDate");
            if (subscriptionEndDate != null && !subscriptionEndDate.isEmpty()) {
                try {
                    LocalDate expiryDate = LocalDate.parse(subscriptionEndDate.substring(0, 10));
                    expiryAlertService.createAlert(
                        principal.getOrganizationId(),
                        ExpiryItemType.TRACKING_CONTRACT.name(),
                        expense.getId(),
                        providerName != null ? providerName : "Tracking",
                        "Tracking subscription",
                        expenseReq.getVehicleId(),
                        null,
                        expiryDate
                    );
                    log.info("Created tracking contract expiry alert for expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to create tracking contract expiry alert for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create tracking expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create license renewal expense
     */
    @PostMapping(value = "/license", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createLicenseExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.LICENSE_RENEWAL);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            // Use newExpiryDate for expense_date, not renewal date
            String expiryDateStr = getStringOrNull(root, "newExpiryDate");
            if (expiryDateStr != null) {
                expenseReq.setExpenseDate(LocalDate.parse(expiryDateStr.substring(0, 10)));
            } else {
                expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            }
            String registrationAuthority = getStringOrNull(root, "registrationAuthority");
            if (registrationAuthority == null) {
                registrationAuthority = getStringOrNull(root, "issuingAuthority");
            }
            expenseReq.setSupplierName(registrationAuthority != null ? registrationAuthority : (root.has("supplierName") ? root.get("supplierName").asText() : null));
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "License Renewal");
            expenseReq.setOdometerReading(getIntOrNull(root, "odometerReading"));

            String renewalDate = getStringOrNull(root, "date");
            String newExpiryDate = getStringOrNull(root, "newExpiryDate");
            if (newExpiryDate == null) {
                newExpiryDate = getStringOrNull(root, "expiryDate");
            }

            ObjectNode extraFields = createExtraFieldsObject();
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

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());
            uploadExpenseReceiptIfPresent(expense, receipt, "License Renewal Receipt", principal);

            // Create vehicle license expiry alert if new expiry date is provided
            if (newExpiryDate != null && !newExpiryDate.isEmpty()) {
                try {
                    LocalDate licenceExpiry = LocalDate.parse(newExpiryDate.substring(0, 10));
                    String licenseNumber = getStringOrNull(root, "licenseNumber");
                    String licenseType = getStringOrNull(root, "licenseType");
                    
                    expiryAlertService.createAlert(
                        principal.getOrganizationId(),
                        ExpiryItemType.VEHICLE_LICENSE.name(),
                        expense.getId(),
                        licenseNumber != null ? licenseNumber : "Vehicle License",
                        licenseType != null ? licenseType : "Vehicle license disc",
                        expenseReq.getVehicleId(),
                        null,
                        licenceExpiry
                    );
                    log.info("Created vehicle license expiry alert for expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to create vehicle license expiry alert for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create license expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create roadworthy certificate expense
     */
    @PostMapping(value = "/roadworthy", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createRoadworthyExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.ROADWORTHY);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Roadworthy Certificate");
            expenseReq.setOdometerReading(getIntOrNull(root, "vehicleOdometer"));

            // Create extra fields object for roadworthy specific data
            ObjectNode extraFields = createExtraFieldsObject();
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
            extraFields.put("odometerReading", getIntOrNull(root, "vehicleOdometer"));
            extraFields.put("vehicleRegistration", getStringOrNull(root, "vehicleRegistration"));
            extraFields.put("failureReasons", getStringOrNull(root, "failureReasons"));
            extraFields.put("conditionsApplied", getStringOrNull(root, "conditionsApplied"));
            extraFields.put("notes", getStringOrNull(root, "notes"));

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());
            uploadExpenseReceiptIfPresent(expense, receipt, "Roadworthy Receipt", principal);

            // Create roadworthy expiry alert if expiry date is provided
            String expiryDate = getStringOrNull(root, "expiryDate");
            if (expiryDate != null && !expiryDate.isEmpty()) {
                try {
                    LocalDate roadworthyExpiry = LocalDate.parse(expiryDate.substring(0, 10));
                    String testingStation = getStringOrNull(root, "testingStationName");
                    expiryAlertService.createAlert(
                        principal.getOrganizationId(),
                        ExpiryItemType.ROADWORTHY.name(),
                        expense.getId(),
                        testingStation != null ? testingStation : "Roadworthy",
                        "Roadworthy certificate",
                        expenseReq.getVehicleId(),
                        null,
                        roadworthyExpiry
                    );
                    log.info("Created roadworthy expiry alert for expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to create roadworthy expiry alert for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create roadworthy expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create e-toll expense
     */
    @PostMapping(value = "/etoll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createEtollExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.ETOLL_SANRAL);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "E-Toll");

            // Create extra fields object for e-toll specific data
            ObjectNode extraFields = createExtraFieldsObject();
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

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            // Optionally attach receipt image as an entry image
            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "E-Toll Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload e-toll receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create etoll expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update e-toll expense
     */
    @PutMapping(value = "/etoll/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateEtollExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateEtollExpense(id, root);

            // Optionally attach a new receipt image
            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "E-Toll Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated e-toll receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update etoll expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update insurance premium expense
     */
    @PutMapping(value = "/insurance/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateInsuranceExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @RequestParam(value = "odometerPhoto", required = false) MultipartFile odometerPhoto,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateInsuranceExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Insurance Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated insurance receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }
            
            // Upload odometer photo as separate entry image with type ODOMETER
            if (odometerPhoto != null && !odometerPhoto.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                        EntryType.EXPENSE,
                        expense.getId(),
                        odometerPhoto,
                        "Odometer Reading Proof",
                        principal.getOrganizationId(),
                        principal.getUserId(),
                        "ODOMETER"
                    );
                    log.info("Uploaded odometer photo for insurance expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to upload odometer photo for insurance expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update insurance expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update vehicle tracking expense
     */
    @PutMapping(value = "/tracking/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateTrackingExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @RequestParam(value = "odometerPhoto", required = false) MultipartFile odometerPhoto,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateTrackingExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Tracking Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated tracking receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            // Upload odometer photo as separate entry image with type ODOMETER
            if (odometerPhoto != null && !odometerPhoto.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                        EntryType.EXPENSE,
                        expense.getId(),
                        odometerPhoto,
                        "Odometer Reading Proof",
                        principal.getOrganizationId(),
                        principal.getUserId(),
                        "ODOMETER"
                    );
                    log.info("Uploaded odometer photo for tracking expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to upload odometer photo for tracking expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update tracking expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update vehicle license renewal expense
     */
    @PutMapping(value = "/license/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateLicenseRenewalExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateLicenseRenewalExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "License Renewal Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated license renewal receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update license renewal expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update roadworthy certificate expense
     */
    @PutMapping(value = "/roadworthy/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateRoadworthyExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateRoadworthyExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Roadworthy Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated roadworthy receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update roadworthy expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update personal license expense
     */
    @PutMapping(value = "/personal-license/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updatePersonalLicenseExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updatePersonalLicenseExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Personal License Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated personal license receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update personal license expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update other fixed expense
     */
    @PutMapping(value = "/other-fixed/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateOtherFixedExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateOtherFixedExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Other Fixed Expense Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated other fixed expense receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update other fixed expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update parking expense (uses same logic as other fixed expense)
     */
    @PutMapping(value = "/parking/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateParkingExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateOtherFixedExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                try {
                    entryImageService.uploadImage(
                            EntryType.EXPENSE,
                            expense.getId(),
                            receipt,
                            "Parking Receipt",
                            principal.getOrganizationId(),
                            principal.getUserId()
                    );
                } catch (Exception ex) {
                    log.warn("Failed to upload updated parking receipt image for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update parking expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create car wash expense
     */
    @PostMapping(value = "/carwash", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','DRIVER','SUPER_ADMIN')")
    public ResponseEntity<ExpenseDTO> createCarwashExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.CAR_WASH);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Car Wash");

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            CarWash carWash = CarWash.builder()
                    .expense(new za.co.fleetexpense.entity.Expense())
                    .washType(root.has("washType") && !root.get("washType").isNull()
                            ? CarWashType.valueOf(root.get("washType").asText())
                            : CarWashType.WASH_AND_GO)
                    .washName(getStringOrNull(root, "washName") != null ? getStringOrNull(root, "washName") : getStringOrNull(root, "supplierName"))
                    .washLocation(getStringOrNull(root, "location") != null ? getStringOrNull(root, "location") : getStringOrNull(root, "washLocation"))
                    .notes(getStringOrNull(root, "notes"))
                    .interiorCleaned(false)
                    .exteriorCleaned(true)
                    .engineCleaned(false)
                    .build();
            carWash.getExpense().setId(expense.getId());
            carWashService.create(carWash);

            uploadExpenseReceiptIfPresent(expense, receipt, "Car Wash Receipt", principal);
            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create carwash expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/carwash/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateCarwashExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateCarWashExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                uploadExpenseReceiptIfPresent(expense, receipt, "Car Wash Receipt", principal);
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update carwash expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create personal license expense
     */
    @PostMapping(value = "/personal-license", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createPersonalLicenseExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            // Personal license expenses don't require vehicle association
            expenseReq.setVehicleId(null);
            expenseReq.setCategory(ExpenseCategory.PERSONAL_LICENSE);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("issuingAuthority") ? root.get("issuingAuthority").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Personal License");

            // Create extra fields object for personal license specific data
            ObjectNode extraFields = createExtraFieldsObject();
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

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());
            uploadExpenseReceiptIfPresent(expense, receipt, "Personal License Receipt", principal);

            // Create personal license expiry alert if expiry date is provided
            String expiryDate = getStringOrNull(root, "expiryDate");
            if (expiryDate != null && !expiryDate.isEmpty()) {
                try {
                    LocalDate licenseExpiry = LocalDate.parse(expiryDate.substring(0, 10));
                    String licenseType = getStringOrNull(root, "licenseType");
                    String licenseNumber = getStringOrNull(root, "licenseNumber");
                    
                    // Determine item type based on license type
                    String itemType = ExpiryItemType.PERSONAL_ID_CARD.name();
                    if (licenseType != null && licenseType.toUpperCase().contains("DRIVER")) {
                        itemType = ExpiryItemType.DRIVERS_LICENSE.name();
                    }
                    
                    expiryAlertService.createAlert(
                        principal.getOrganizationId(),
                        itemType,
                        expense.getId(),
                        licenseNumber != null ? licenseNumber : "Personal License",
                        licenseType != null ? licenseType : "Personal license",
                        null,
                        principal.getUserId(),
                        licenseExpiry
                    );
                    log.info("Created personal license expiry alert for expense {}", expense.getId());
                } catch (Exception ex) {
                    log.warn("Failed to create personal license expiry alert for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create personal license expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create other fixed expense
     */
    @PostMapping(value = "/other-fixed", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createOtherFixedExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.OTHER_FIXED);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Other Expense");

            // Create extra fields object for other fixed expense specific data
            // IMPORTANT: categoryLabel is used by the recurring expense system to identify expense types (e.g., "Parking", "Tolls", "Fines")
            ObjectNode extraFields = createExtraFieldsObject();
            extraFields.put("categoryLabel", getStringOrNull(root, "categoryLabel"));
            extraFields.put("referenceNumber", getStringOrNull(root, "referenceNumber"));
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

            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());
            uploadExpenseReceiptIfPresent(expense, receipt, "Other Fixed Expense Receipt", principal);
            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create other fixed expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create mechanic service expense
     */
    @PostMapping(value = "/mechanic", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createMechanicServiceExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.MECHANIC_SERVICE);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Mechanic Service");
            expenseReq.setInvoiceNumber(getStringOrNull(root, "invoiceNumber"));
            expenseReq.setOdometerReading(getIntOrNull(root, "odometerReading"));

            ObjectNode extraFields = createExtraFieldsObject();
            extraFields.put("glassProvider", getStringOrNull(root, "glassProvider"));
            extraFields.put("excessAmountZar", getBigDecimalOrNull(root, "excessAmountZar"));
            extraFields.put("notes", getStringOrNull(root, "notes"));
            expenseReq.setExtraFields(extraFields.toString());

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            ServiceType serviceType = root.has("serviceType") && !root.get("serviceType").isNull()
                    ? ServiceType.valueOf(root.get("serviceType").asText())
                    : ServiceType.MINOR_SERVICE;

            MechanicService mechanicService = MechanicService.builder()
                    .expense(new za.co.fleetexpense.entity.Expense())
                    .serviceType(serviceType)
                    .workshopName(getStringOrNull(root, "workshopName") != null ? getStringOrNull(root, "workshopName") : getStringOrNull(root, "supplierName"))
                    .workDescription(getStringOrNull(root, "workDescription"))
                    .laborCostZar(getBigDecimalOrNull(root, "laborCostZar"))
                    .partsCostZar(getBigDecimalOrNull(root, "partsCostZar"))
                    .build();
            mechanicService.getExpense().setId(expense.getId());
            mechanicServiceService.create(mechanicService);

            // Calculate next service due date based on vehicle intervals
            Vehicle vehicle = vehicleRepository.findById(expenseReq.getVehicleId()).orElse(null);
            if (vehicle != null) {
                Integer odometerReading = expenseReq.getOdometerReading();
                LocalDate nextServiceDueDate = null;
                Integer nextServiceDueKm = null;

                // Get the appropriate interval based on service type
                Integer intervalKm = null;
                Integer intervalMonths = null;

                switch (serviceType) {
                    case MINOR_SERVICE:
                        intervalKm = vehicle.getMinorServiceIntervalKm();
                        intervalMonths = vehicle.getMinorServiceIntervalMonths();
                        break;
                    case MAJOR_SERVICE:
                        intervalKm = vehicle.getMajorServiceIntervalKm();
                        intervalMonths = vehicle.getMajorServiceIntervalMonths();
                        break;
                    case BRAKE_OVERHAUL:
                        intervalKm = vehicle.getBrakeOverhaulIntervalKm();
                        intervalMonths = vehicle.getBrakeOverhaulIntervalMonths();
                        break;
                    case ENGINE_REPAIR:
                    case TRANSMISSION:
                    case SUSPENSION:
                    case ELECTRICAL:
                    case AIR_CONDITIONING:
                    case WINDSCREEN_GLASS:
                    case OTHER:
                        // These service types don't have specific intervals
                        break;
                }

                // Calculate next service due based on odometer (considering drift - use current odometer from vehicle)
                if (intervalKm != null && odometerReading != null) {
                    nextServiceDueKm = odometerReading + intervalKm;
                }

                // Calculate next service due based on date
                if (intervalMonths != null) {
                    nextServiceDueDate = expenseReq.getExpenseDate().plusMonths(intervalMonths);
                }

                // Update mechanic service with calculated due dates
                mechanicService.setNextServiceDueKm(nextServiceDueKm);
                mechanicService.setNextServiceDueDate(nextServiceDueDate);
                mechanicServiceService.update(mechanicService);

                // Create expiry alert for next service due (date-based)
                if (nextServiceDueDate != null) {
                    try {
                        expiryAlertService.createAlert(
                            principal.getOrganizationId(),
                            ExpiryItemType.MECHANIC_SERVICE.name(),
                            expense.getId(),
                            serviceType.name(),
                            serviceType.name() + " due",
                            expenseReq.getVehicleId(),
                            null,
                            nextServiceDueDate
                        );
                        log.info("Created mechanic service expiry alert for expense {}", expense.getId());
                    } catch (Exception ex) {
                        log.warn("Failed to create mechanic service expiry alert for expense {}: {}", expense.getId(), ex.getMessage());
                    }
                }

                // Check odometer-based proximity immediately
                try {
                    if (vehicle != null) {
                        mechanicServiceAlertService.checkServiceAlert(mechanicService, vehicle);
                        log.info("Checked mechanic service odometer proximity for expense {}", expense.getId());
                    }
                } catch (Exception ex) {
                    log.warn("Failed to check mechanic service odometer proximity for expense {}: {}", expense.getId(), ex.getMessage());
                }
            }

            uploadExpenseReceiptIfPresent(expense, receipt, "Mechanic Service Receipt", principal);
            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create mechanic service expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/mechanic/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateMechanicExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateMechanicExpense(id, root);

            // Recalculate next service due date based on vehicle intervals
            ServiceType serviceType = root.has("serviceType") && !root.get("serviceType").isNull()
                    ? ServiceType.valueOf(root.get("serviceType").asText())
                    : ServiceType.MINOR_SERVICE;

            Vehicle vehicle = vehicleRepository.findById(expense.getVehicleId()).orElse(null);
            if (vehicle != null) {
                Integer odometerReading = getIntOrNull(root, "odometerReading");
                LocalDate nextServiceDueDate = null;
                Integer nextServiceDueKm = null;

                // Get the appropriate interval based on service type
                Integer intervalKm = null;
                Integer intervalMonths = null;

                switch (serviceType) {
                    case MINOR_SERVICE:
                        intervalKm = vehicle.getMinorServiceIntervalKm();
                        intervalMonths = vehicle.getMinorServiceIntervalMonths();
                        break;
                    case MAJOR_SERVICE:
                        intervalKm = vehicle.getMajorServiceIntervalKm();
                        intervalMonths = vehicle.getMajorServiceIntervalMonths();
                        break;
                    case BRAKE_OVERHAUL:
                        intervalKm = vehicle.getBrakeOverhaulIntervalKm();
                        intervalMonths = vehicle.getBrakeOverhaulIntervalMonths();
                        break;
                    case ENGINE_REPAIR:
                    case TRANSMISSION:
                    case SUSPENSION:
                    case ELECTRICAL:
                    case AIR_CONDITIONING:
                    case WINDSCREEN_GLASS:
                    case OTHER:
                        // These service types don't have specific intervals
                        break;
                }

                // Calculate next service due based on odometer
                if (intervalKm != null && odometerReading != null) {
                    nextServiceDueKm = odometerReading + intervalKm;
                }

                // Calculate next service due based on date
                if (intervalMonths != null && expense.getExpenseDate() != null) {
                    nextServiceDueDate = expense.getExpenseDate().plusMonths(intervalMonths);
                }

                // Update mechanic service with calculated due dates
                MechanicService mechanicService = mechanicServiceService.getByExpenseId(id);
                if (mechanicService != null) {
                    mechanicService.setNextServiceDueKm(nextServiceDueKm);
                    mechanicService.setNextServiceDueDate(nextServiceDueDate);
                    mechanicServiceService.update(mechanicService);

                    // Update or create expiry alert for next service due
                    if (nextServiceDueDate != null) {
                        try {
                            // Dismiss existing alert for this item
                            try {
                                expiryAlertService.dismissAlertByItem(ExpiryItemType.MECHANIC_SERVICE.name(), id, principal.getUserId());
                            } catch (Exception ex) {
                                // Alert might not exist, ignore
                            }

                            // Create new alert
                            expiryAlertService.createAlert(
                                principal.getOrganizationId(),
                                ExpiryItemType.MECHANIC_SERVICE.name(),
                                id,
                                serviceType.name(),
                                serviceType.name() + " due",
                                expense.getVehicleId(),
                                null,
                                nextServiceDueDate
                            );
                            log.info("Updated mechanic service expiry alert for expense {}", id);
                        } catch (Exception ex) {
                            log.warn("Failed to update mechanic service expiry alert for expense {}: {}", id, ex.getMessage());
                        }
                    }
                }
            }

            if (receipt != null && !receipt.isEmpty()) {
                uploadExpenseReceiptIfPresent(expense, receipt, "Mechanic Service Receipt", principal);
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update mechanic expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create maintenance topup expense (alias for /maintenance)
     */
    @PostMapping(value = "/maintenance", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> createMaintenanceTopupExpense(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseCreateRequest expenseReq = new ExpenseCreateRequest();
            expenseReq.setVehicleId(UUID.fromString(root.get("vehicleId").asText()));
            expenseReq.setCategory(ExpenseCategory.MAINTENANCE_TOPUP);
            expenseReq.setAmountZar(new BigDecimal(root.get("amount").asText()));
            expenseReq.setExpenseDate(LocalDate.parse(root.get("date").asText().substring(0, 10)));
            expenseReq.setSupplierName(root.has("supplierName") ? root.get("supplierName").asText() : null);
            expenseReq.setDescription(root.has("description") ? root.get("description").asText() : "Maintenance Top-up");

            ExpenseDTO expense = expenseService.create(expenseReq, principal.getOrganizationId(), principal.getUserId());

            MaintenanceTopup maintenanceTopup = MaintenanceTopup.builder()
                    .expense(new za.co.fleetexpense.entity.Expense())
                    .itemType(root.has("itemType") && !root.get("itemType").isNull()
                            ? MaintenanceItemType.valueOf(root.get("itemType").asText())
                            : MaintenanceItemType.ENGINE_OIL)
                    .itemBrand(getStringOrNull(root, "itemBrand"))
                    .itemQuantity(root.has("itemQuantity") && !root.get("itemQuantity").isNull()
                            ? new BigDecimal(root.get("itemQuantity").asText())
                            : BigDecimal.ONE)
                    .shopName(getStringOrNull(root, "shopName") != null ? getStringOrNull(root, "shopName") : getStringOrNull(root, "supplierName"))
                    .notes(getStringOrNull(root, "notes"))
                    .build();
            maintenanceTopup.getExpense().setId(expense.getId());
            maintenanceTopupService.create(maintenanceTopup, principal.getOrganizationId());

            uploadExpenseReceiptIfPresent(expense, receipt, "Maintenance Receipt", principal);
            return ResponseEntity.status(HttpStatus.CREATED).body(expense);
        } catch (Exception e) {
            log.error("Failed to create maintenance topup expense: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/maintenance/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateMaintenanceExpense(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt,
            @AuthenticationPrincipal UserPrincipal principal) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            JsonNode root = mapper.readTree(dataJson);

            ExpenseDTO expense = expenseService.updateMaintenanceExpense(id, root);

            if (receipt != null && !receipt.isEmpty()) {
                uploadExpenseReceiptIfPresent(expense, receipt, "Maintenance Receipt", principal);
            }

            return ResponseEntity.ok(expense);
        } catch (Exception e) {
            log.error("Failed to update maintenance expense {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> updateExpense(
            @PathVariable UUID id,
            @Valid @RequestBody ExpenseUpdateRequest request) {
        return ResponseEntity.ok(expenseService.update(id, request));
    }

    @DeleteMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<Map<String, String>> deleteExpense(@PathVariable UUID id) {
        expenseService.delete(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Expense deleted successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}/lock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> lockExpense(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expenseService.toggleLock(id, true, principal.getUserId(), reason));
    }

    @PatchMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}/lock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> lockExpensePatch(
            @PathVariable UUID id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(expenseService.toggleLock(id, true, principal.getUserId(), reason));
    }

    @PostMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}/unlock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> unlockExpense(@PathVariable UUID id) {
        return ResponseEntity.ok(expenseService.toggleLock(id, false, null, null));
    }

    @PatchMapping("/{id:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}/unlock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER')")
    public ResponseEntity<ExpenseDTO> unlockExpensePatch(@PathVariable UUID id) {
        return ResponseEntity.ok(expenseService.toggleLock(id, false, null, null));
    }

    // ==================== ANALYTICS ENDPOINTS ====================

    @GetMapping("/analytics/total")
    public ResponseEntity<BigDecimal> getTotalExpenses(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        BigDecimal total = expenseService.getTotalExpenses(principal.getOrganizationId(), startDate, endDate, principal.getUserId(), principal.getRole(), principal.getOrganizationMode());
        return ResponseEntity.ok(total);
    }

    @GetMapping("/analytics/by-category")
    public ResponseEntity<Map<ExpenseCategory, BigDecimal>> getExpensesByCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Map<ExpenseCategory, BigDecimal> breakdown = expenseService.getExpensesByCategory(
                principal.getOrganizationId(), startDate, endDate, principal.getUserId(), principal.getRole(), principal.getOrganizationMode());
        return ResponseEntity.ok(breakdown);
    }

    @GetMapping("/analytics/monthly/{year}")
    public ResponseEntity<Map<String, BigDecimal>> getMonthlySummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable int year) {

        Map<String, BigDecimal> summary = expenseService.getMonthlySummary(principal.getOrganizationId(), year, principal.getUserId(), principal.getRole(), principal.getOrganizationMode());
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/analytics/tax-deductible/{taxYear}")
    public ResponseEntity<BigDecimal> getTaxDeductibleTotal(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable int taxYear) {

        BigDecimal total = expenseService.getTaxDeductibleTotal(principal.getOrganizationId(), taxYear, principal.getUserId(), principal.getRole(), principal.getOrganizationMode());
        return ResponseEntity.ok(total);
    }

    // ==================== HELPER METHODS ====================

    private String getStringOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private Integer getIntOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asInt() : null;
    }

    private BigDecimal getBigDecimalOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ?
            new BigDecimal(node.get(field).asText()) : null;
    }

    private Boolean getBooleanOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asBoolean() : null;
    }

    private ObjectNode createExtraFieldsObject() {
        return objectMapper.createObjectNode();
    }

    private void uploadExpenseReceiptIfPresent(ExpenseDTO expense, MultipartFile receipt, String label, UserPrincipal principal) {
        if (expense == null || receipt == null || receipt.isEmpty()) {
            return;
        }

        entryImageService.uploadImage(
                EntryType.EXPENSE,
                expense.getId(),
                receipt,
                label,
                principal.getOrganizationId(),
                principal.getUserId()
        );
    }
}
