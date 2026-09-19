package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.TripCreateRequest;
import za.co.fleetexpense.dto.TripDTO;
import za.co.fleetexpense.dto.TripUpdateRequest;
import za.co.fleetexpense.entity.Trip;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.OdometerReadingType;
import za.co.fleetexpense.entity.enums.TripPurpose;
import za.co.fleetexpense.entity.enums.UserRole;
import za.co.fleetexpense.enums.DistanceSource;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.TripMapper;
import za.co.fleetexpense.repository.OdometerVerificationRepository;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.TripRepository;
import za.co.fleetexpense.repository.UserAssistantRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;
import za.co.fleetexpense.repository.VehicleTaxProfileRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TripService {

    private final TripRepository tripRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final TripMapper tripMapper;
    private final PermissionService permissionService;
    private final UserAssistantRepository userAssistantRepository;
    private final OdometerVerificationRepository odometerVerificationRepository;
    private final VehicleTaxProfileRepository vehicleTaxProfileRepository;

    // ==================== DTO-BASED CRUD OPERATIONS ====================

    // Helper to check if user is an assistant and apply assistant constraints
    private boolean shouldIncludeTripForAssistant(Trip trip, UUID userId) {
        List<za.co.fleetexpense.entity.UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        if (assistantRelationships.isEmpty()) {
            return true; // Not an assistant, no filtering
        }

        za.co.fleetexpense.entity.UserAssistant relationship = assistantRelationships.get(0);

        // Filter by assigned vehicle if specified
        if (relationship.getAssignedVehicleId() != null) {
            if (!relationship.getAssignedVehicleId().equals(trip.getVehicle().getId())) {
                return false;
            }
        }

        // Filter by date range if specified
        LocalDate tripDate = trip.getTripDate();
        if (relationship.getAssignedDateRangeStart() != null && tripDate.isBefore(relationship.getAssignedDateRangeStart())) {
            return false;
        }
        if (relationship.getAssignedDateRangeEnd() != null && tripDate.isAfter(relationship.getAssignedDateRangeEnd())) {
            return false;
        }

        return true;
    }

    public List<TripDTO> getAllByOrganization(UUID organizationId, UUID userId, UserRole role) {
        organizationId = organizationId != null ? organizationId : userId; // Fallback for individual accounts
        
        // Check VIEW_OWN_LOGBOOK or VIEW_ALL_LOGBOOKS permission
        boolean canViewOwn = permissionService.isAllowed(organizationId, "LOGBOOK", "VIEW_OWN_LOGBOOK", role.name());
        boolean canViewAll = permissionService.isAllowed(organizationId, "LOGBOOK", "VIEW_ALL_LOGBOOKS", role.name());
        
        if (!canViewOwn && !canViewAll) {
            throw new ValidationException("You do not have permission to view the logbook");
        }

        // Check if user is an individual account assistant (via user_assistants table)
        List<za.co.fleetexpense.entity.UserAssistant> assistantRelationships = userAssistantRepository.findByAssistantId(userId);
        boolean isIndividualAssistant = !assistantRelationships.isEmpty();

        List<Trip> trips;
        if (isIndividualAssistant) {
            // Individual assistants see owner's trips (filtered by assistant constraints)
            za.co.fleetexpense.entity.UserAssistant relationship = assistantRelationships.get(0);
            UUID ownerId = relationship.getOwnerId();
            trips = tripRepository.findByOrganizationIdAndUserIdWithVehicle(organizationId, ownerId);
        } else if (role == UserRole.DRIVER) {
            trips = tripRepository.findByOrganizationIdAndUserIdWithVehicle(organizationId, userId);
        } else {
            trips = tripRepository.findByOrganizationIdWithVehicle(organizationId);
        }
        return trips.stream()
                .filter(trip -> shouldIncludeTripForAssistant(trip, userId))
                .map(tripMapper::toDTO)
                .collect(Collectors.toList());
    }

    public TripDTO getById(UUID id, UUID userId, UserRole role) {
        Trip trip = tripRepository.findByIdWithVehicle(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + id));
        if (role == UserRole.DRIVER) {
            if (!trip.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Trip not found: " + id);
            }
        }
        return tripMapper.toDTO(trip);
    }

    public List<TripDTO> getByVehicle(UUID vehicleId, UUID userId, UserRole role) {
        if (role == UserRole.DRIVER) {
            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found");
            }
        }
        List<Trip> trips = tripRepository.findByVehicleIdWithVehicle(vehicleId);
        return trips.stream()
                .filter(trip -> shouldIncludeTripForAssistant(trip, userId))
                .map(tripMapper::toDTO)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getLastOdometerReading(UUID vehicleId, UUID userId, UserRole role) {
        try {
            log.info("Fetching last odometer reading for vehicleId: {}, userId: {}, role: {}", vehicleId, userId, role);
            
            if (role == UserRole.DRIVER) {
                Vehicle vehicle = vehicleRepository.findById(vehicleId)
                        .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
                if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                    throw new ResourceNotFoundException("Vehicle not found");
                }
            }

            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

            log.info("Vehicle found: {}, current odometer: {}", vehicle.getRegistrationNumber(), vehicle.getCurrentOdometer());

            // Get the last trip's end odometer reading
            List<Trip> lastTrips = tripRepository.findTopByVehicleIdOrderByEndDateDescWithVehicle(vehicleId);
            Integer lastOdometer = null;
            
            log.info("Found {} trips for vehicle", lastTrips.size());
            
            if (!lastTrips.isEmpty()) {
                lastOdometer = lastTrips.get(0).getEndOdometer();
                log.info("Last trip end odometer: {}", lastOdometer);
            }

            // Fall back to vehicle's current odometer if no trips found
            if (lastOdometer == null) {
                lastOdometer = vehicle.getCurrentOdometer();
                log.info("Using vehicle current odometer: {}", lastOdometer);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("vehicleId", vehicleId);
            response.put("lastOdometer", lastOdometer);
            response.put("currentOdometer", vehicle.getCurrentOdometer());
            response.put("vehicleName", vehicle.getMake() + " " + vehicle.getModel());

            log.info("Returning odometer response: {}", response);
            return response;
        } catch (Exception e) {
            log.error("Error fetching last odometer reading for vehicleId: {}", vehicleId, e);
            throw e;
        }
    }

    /**
     * Get the latest business trip end odometer for odometer chaining
     * This is used to pre-fill the start odometer for new business trips
     * If tripDate is provided, returns the latest business trip BEFORE that date/time (for backdated entry)
     * If tripDate is null, returns the latest business trip overall (for current entry)
     * Handles same-day trips using startTime comparison
     */
    public Integer getLatestBusinessTripEndOdometer(UUID vehicleId, LocalDate tripDate, String startTime, UUID userId, UserRole role) {
        if (role == UserRole.DRIVER) {
            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found");
            }
        }

        // Get the last business trip's end odometer reading
        List<Trip> lastBusinessTrips;
        if (tripDate != null) {
            // For backdated entry: get latest business trip BEFORE the specified date/time
            lastBusinessTrips = tripRepository.findTopByVehicleIdAndPurposeAndChronologyBeforeOrderByTripDateDescStartTimeDesc(
                    vehicleId, TripPurpose.BUSINESS, tripDate, startTime);
        } else {
            // For current entry: get latest business trip overall
            lastBusinessTrips = tripRepository.findTopByVehicleIdAndPurposeOrderByTripDateDescStartTimeDesc(
                    vehicleId, TripPurpose.BUSINESS);
        }

        if (!lastBusinessTrips.isEmpty()) {
            return lastBusinessTrips.get(0).getEndOdometer();
        }

        return null; // No business trips exist
    }

    /**
     * Get trip summary statistics using database view for efficient calculation
     */
    public Map<String, Object> getTripSummary(UUID vehicleId, UUID userId, UserRole role) {
        // If vehicleId is provided, use the view with WHERE clause, otherwise aggregate all vehicles
        Map<String, Object> result;
        if (vehicleId != null) {
            // Verify access to vehicle
            if (role == UserRole.DRIVER) {
                Vehicle vehicle = vehicleRepository.findById(vehicleId)
                        .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
                if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                    throw new ResourceNotFoundException("Vehicle not found");
                }
            }
            result = tripRepository.findTripSummaryByVehicle(vehicleId);
        } else {
            result = tripRepository.findTripSummaryAll();
        }
        
        if (result == null || result.isEmpty()) {
            // Return empty stats if no trips
            Map<String, Object> emptyStats = new HashMap<>();
            emptyStats.put("vehicleId", vehicleId != null ? vehicleId : "all");
            emptyStats.put("totalTrips", 0);
            emptyStats.put("businessTrips", 0);
            emptyStats.put("privateTrips", 0);
            emptyStats.put("totalKm", 0);
            emptyStats.put("businessKm", 0);
            emptyStats.put("privateKm", 0);
            emptyStats.put("businessPercentage", 0);
            return emptyStats;
        }

        // Create a new mutable map to avoid TupleBackedMap modification error
        Map<String, Object> mutableResult = new HashMap<>(result);

        // Convert snake_case column names from database view to camelCase for API response
        Map<String, Object> camelCaseResult = new HashMap<>();
        camelCaseResult.put("vehicleId", vehicleId != null ? vehicleId : "all");
        camelCaseResult.put("totalTrips", mutableResult.get("total_trips"));
        camelCaseResult.put("businessTrips", mutableResult.get("business_trips"));
        camelCaseResult.put("privateTrips", mutableResult.get("private_trips"));
        camelCaseResult.put("totalKm", mutableResult.get("total_km"));
        camelCaseResult.put("businessKm", mutableResult.get("business_km"));
        camelCaseResult.put("privateKm", mutableResult.get("private_km"));
        camelCaseResult.put("businessPercentage", mutableResult.get("business_percentage"));

        // Attach monthly breakdown used by dashboard chart when a specific vehicle is selected
        if (vehicleId != null) {
            List<Trip> tripsForVehicle = tripRepository.findByVehicleIdWithVehicle(vehicleId);
            List<Map<String, Object>> monthlyBreakdown = buildMonthlyBreakdown(tripsForVehicle);
            camelCaseResult.put("monthlyBreakdown", monthlyBreakdown);
        }

        return camelCaseResult;
    }

    /**
     * Build monthly business vs private km breakdown for a vehicle.
     * Groups by YearMonth of tripDate and sums distanceKm by purpose.
     */
    private List<Map<String, Object>> buildMonthlyBreakdown(List<Trip> trips) {
        Map<YearMonth, int[]> byMonth = new HashMap<>(); // [0] = businessKm, [1] = privateKm

        for (Trip trip : trips) {
            if (trip.getTripDate() == null || trip.getDistanceKm() == null) {
                continue;
            }
            YearMonth ym = YearMonth.from(trip.getTripDate());
            int[] acc = byMonth.computeIfAbsent(ym, k -> new int[2]);

            if (trip.getPurpose() == TripPurpose.BUSINESS) {
                acc[0] += trip.getDistanceKm();
            } else if (trip.getPurpose() == TripPurpose.PRIVATE) {
                acc[1] += trip.getDistanceKm();
            }
        }

        List<Map<String, Object>> breakdown = new ArrayList<>();

        byMonth.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
                    YearMonth ym = entry.getKey();
                    int[] acc = entry.getValue();
                    Map<String, Object> row = new HashMap<>();

                    String monthLabel = ym.getMonth()
                            .getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " +
                            String.valueOf(ym.getYear()).substring(2);

                    row.put("month", monthLabel);
                    row.put("businessKm", acc[0]);
                    row.put("privateKm", acc[1]);
                    breakdown.add(row);
                });

        return breakdown;
    }

    public List<TripDTO> getByDateRange(UUID organizationId, LocalDate start, LocalDate end, UUID userId, UserRole role) {
        List<Trip> trips;
        if (role == UserRole.DRIVER) {
            trips = tripRepository.findByOrganizationIdAndUserIdAndDateRangeWithVehicle(organizationId, userId, start, end);
        } else {
            trips = tripRepository.findByOrganizationAndDateRangeWithVehicle(organizationId, start, end);
        }
        return trips.stream()
                .map(tripMapper::toDTO)
                .collect(Collectors.toList());
    }

    public List<TripDTO> getByPurpose(UUID organizationId, TripPurpose purpose, UUID userId, UserRole role) {
        List<Trip> trips;
        if (role == UserRole.DRIVER) {
            trips = tripRepository.findByOrganizationIdAndUserIdAndPurposeWithVehicle(organizationId, userId, purpose);
        } else {
            trips = tripRepository.findByOrganizationAndPurposeWithVehicle(organizationId, purpose);
        }
        return trips.stream()
                .map(tripMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public TripDTO create(TripCreateRequest request, UUID organizationId, UUID userId, UserRole role) {
        organizationId = organizationId != null ? organizationId : userId; // Fallback for individual accounts

        // Check EDIT_OWN_ENTRIES permission (used for adding trips)
        if (!permissionService.isAllowed(organizationId, "LOGBOOK", "EDIT_OWN_ENTRIES", role.name())) {
            throw new ValidationException("You do not have permission to add trips");
        }

        // Validate entities exist
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));

        // Validate trip purpose based on vehicle type
        // For non-company provided vehicles, only BUSINESS trips are allowed
        var activeTaxProfile = vehicleTaxProfileRepository.findByVehicleIdAndEffectiveToIsNull(request.getVehicleId());
        if (activeTaxProfile.isPresent() && !activeTaxProfile.get().getIsCompanyProvidedVehicle()) {
            if (request.getPurpose() == TripPurpose.PRIVATE) {
                throw new ValidationException("Private trips are not allowed for personal vehicles. Only business trips should be logged. Private kilometres are calculated automatically from total odometer distance.");
            }
        }

        // Map request to entity
        Trip trip = tripMapper.toEntity(request);
        trip.setOrganization(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found")));
        trip.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found")));
        trip.setVehicle(vehicle);

        // Use odometer memory if start odometer not provided
        Integer startOdometer = request.getStartOdometer();
        if (startOdometer == null && vehicle.getCurrentOdometer() != null) {
            startOdometer = vehicle.getCurrentOdometer();
            trip.setStartOdometer(startOdometer);
        }

        // Calculate distance from odometer readings
        if (startOdometer != null && request.getEndOdometer() != null) {
            validateOdometerReadings(startOdometer, request.getEndOdometer(), vehicle);
            // distanceKm is auto-generated by database from odometer values
            
            // Update vehicle's current odometer if this trip has a higher end odometer
            if (request.getEndOdometer() > vehicle.getCurrentOdometer()) {
                vehicle.setCurrentOdometer(request.getEndOdometer());
                vehicleRepository.save(vehicle);
            }
        }

        Trip saved = tripRepository.save(trip);
        log.info("Created SARS-compliant trip {} for vehicle {}", saved.getId(), vehicle.getId());
        return tripMapper.toDTO(saved);
    }

    @Transactional
    public TripDTO update(UUID id, TripUpdateRequest request, UUID organizationId, UserRole role) {
        // Check EDIT_OWN_ENTRIES or EDIT_ALL_ENTRIES permission
        boolean canEditOwn = permissionService.isAllowed(organizationId, "LOGBOOK", "EDIT_OWN_ENTRIES", role.name());
        boolean canEditAll = permissionService.isAllowed(organizationId, "LOGBOOK", "EDIT_ALL_ENTRIES", role.name());

        if (!canEditOwn && !canEditAll) {
            throw new ValidationException("You do not have permission to edit trips");
        }

        Trip existing = tripRepository.findByIdWithVehicle(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + id));

        if (Boolean.TRUE.equals(existing.getIsLocked())) {
            throw new ValidationException("Cannot modify locked trip");
        }

        // Validate trip purpose based on vehicle type
        // For non-company provided vehicles, only BUSINESS trips are allowed
        if (request.getPurpose() != null) {
            var activeTaxProfile = vehicleTaxProfileRepository.findByVehicleIdAndEffectiveToIsNull(existing.getVehicle().getId());
            if (activeTaxProfile.isPresent() && !activeTaxProfile.get().getIsCompanyProvidedVehicle()) {
                if (request.getPurpose() == TripPurpose.PRIVATE) {
                    throw new ValidationException("Private trips are not allowed for personal vehicles. Only business trips should be logged. Private kilometres are calculated automatically from total odometer distance.");
                }
            }
        }

        // Apply updates using mapper
        tripMapper.updateEntity(existing, request);

        // Validate odometer readings if changed
        if (request.getStartOdometer() != null && request.getEndOdometer() != null) {
            validateOdometerReadings(request.getStartOdometer(), request.getEndOdometer(), existing.getVehicle());

            // distanceKm is auto-generated by database from odometer values
        }

        Trip saved = tripRepository.save(existing);
        log.info("Updated SARS-compliant trip {}", id);
        return tripMapper.toDTO(saved);
    }

    @Transactional
    public void delete(UUID id, UUID organizationId, UserRole role) {
        // Check DELETE_OWN_ENTRIES or DELETE_ALL_ENTRIES permission
        boolean canDeleteOwn = permissionService.isAllowed(organizationId, "LOGBOOK", "DELETE_OWN_ENTRIES", role.name());
        boolean canDeleteAll = permissionService.isAllowed(organizationId, "LOGBOOK", "DELETE_ALL_ENTRIES", role.name());
        
        if (!canDeleteOwn && !canDeleteAll) {
            throw new ValidationException("You do not have permission to delete trips");
        }
        
        Trip trip = tripRepository.findByIdWithVehicle(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + id));

        if (Boolean.TRUE.equals(trip.getIsLocked())) {
            throw new ValidationException("Cannot delete locked trip");
        }

        tripRepository.delete(trip);
        log.info("Deleted trip {}", id);
    }

    @Transactional
    public TripDTO toggleLock(UUID id, boolean locked, UUID userId, String reason) {
        Trip trip = tripRepository.findByIdWithVehicle(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + id));

        trip.setIsLocked(locked);
        if (locked) {
            trip.setLockedAt(OffsetDateTime.now());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            trip.setLockedByUser(user);
            trip.setLockedReason(reason);
        } else {
            trip.setLockedAt(null);
            trip.setLockedByUser(null);
            trip.setLockedReason(null);
        }

        Trip saved = tripRepository.save(trip);
        log.info("{} SARS trip {}", locked ? "Locked" : "Unlocked", id);
        return tripMapper.toDTO(saved);
    }

    // ==================== SARS COMPLIANCE BUSINESS LOGIC ====================

    /**
     * Validate odometer readings for SARS compliance
     */
    private void validateOdometerReadings(Integer startOdometer, Integer endOdometer, Vehicle vehicle) {
        if (endOdometer <= startOdometer) {
            throw new ValidationException("End odometer must be greater than start odometer");
        }
        if (vehicle != null && vehicle.getCurrentOdometer() != null) {
            if (startOdometer < vehicle.getCurrentOdometer()) {
                throw new ValidationException("Start odometer cannot be less than vehicle's current odometer");
            }
        }
    }

    /**
     * Get SARS logbook summary for a vehicle in a tax year
     */
    public Map<String, Object> getSarsLogbookSummary(UUID vehicleId, int taxYear, UUID userId, UserRole role) {
        if (role == UserRole.DRIVER) {
            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found");
            }
        }
        List<Trip> trips = tripRepository.findByVehicleIdWithVehicle(vehicleId);

        int totalKm = 0;
        int businessKm = 0;
        int privateKm = 0;
        BigDecimal totalCosts = BigDecimal.ZERO;

        for (Trip trip : trips) {
            if (trip.getTripDate().getYear() == taxYear && trip.getDistanceKm() != null) {
                totalKm += trip.getDistanceKm();

                if (trip.getPurpose() == TripPurpose.BUSINESS) {
                    businessKm += trip.getDistanceKm();
                } else {
                    privateKm += trip.getDistanceKm();
                }

                // Sum trip costs
                BigDecimal tolls = trip.getTollCostsZar() != null ? trip.getTollCostsZar() : BigDecimal.ZERO;
                BigDecimal parking = trip.getParkingCostsZar() != null ? trip.getParkingCostsZar() : BigDecimal.ZERO;
                totalCosts = totalCosts.add(tolls).add(parking);
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("vehicleId", vehicleId);
        summary.put("taxYear", taxYear);
        summary.put("totalTrips", trips.size());
        summary.put("totalKm", totalKm);
        summary.put("businessKm", businessKm);
        summary.put("privateKm", privateKm);

        // Calculate business percentage
        if (totalKm > 0) {
            BigDecimal businessPercentage = BigDecimal.valueOf(businessKm)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(totalKm), 2, RoundingMode.HALF_UP);
            summary.put("businessPercentage", businessPercentage);
        } else {
            summary.put("businessPercentage", BigDecimal.ZERO);
        }

        summary.put("totalTripCosts", totalCosts);

        return summary;
    }

    /**
     * Get business km for a vehicle in a tax year (for SARS calculations)
     * Uses SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
     */
    public Integer getBusinessKmForTaxYear(UUID vehicleId, int taxYear) {
        List<Trip> trips = tripRepository.findByVehicleIdWithVehicle(vehicleId);

        // SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, 3, 1); // March 1st
        LocalDate taxYearEndExclusive = LocalDate.of(taxYear, 3, 1); // March 1st (exclusive)

        return trips.stream()
                .filter(trip -> !trip.getTripDate().isBefore(taxYearStart))
                .filter(trip -> trip.getTripDate().isBefore(taxYearEndExclusive))
                .filter(trip -> trip.getPurpose() == TripPurpose.BUSINESS)
                .mapToInt(Trip::getDistanceKm)
                .sum();
    }

    /**
     * Get private km for a vehicle in a tax year
     * Uses SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
     */
    public Integer getPrivateKmForTaxYear(UUID vehicleId, int taxYear) {
        List<Trip> trips = tripRepository.findByVehicleIdWithVehicle(vehicleId);

        // SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, 3, 1); // March 1st
        LocalDate taxYearEndExclusive = LocalDate.of(taxYear, 3, 1); // March 1st (exclusive)

        return trips.stream()
                .filter(trip -> !trip.getTripDate().isBefore(taxYearStart))
                .filter(trip -> trip.getTripDate().isBefore(taxYearEndExclusive))
                .filter(trip -> trip.getPurpose() == TripPurpose.PRIVATE)
                .mapToInt(Trip::getDistanceKm)
                .sum();
    }

    /**
     * Get unclassified km for a vehicle in a tax year
     * Uses SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
     */
    public Integer getUnclassifiedKmForTaxYear(UUID vehicleId, int taxYear) {
        List<Trip> trips = tripRepository.findByVehicleIdWithVehicle(vehicleId);

        // SARS tax-year window: 1 March (taxYear-1) through 28/29 February (taxYear)
        LocalDate taxYearStart = LocalDate.of(taxYear - 1, 3, 1); // March 1st
        LocalDate taxYearEndExclusive = LocalDate.of(taxYear, 3, 1); // March 1st (exclusive)

        return trips.stream()
                .filter(trip -> !trip.getTripDate().isBefore(taxYearStart))
                .filter(trip -> trip.getTripDate().isBefore(taxYearEndExclusive))
                .filter(trip -> trip.getPurpose() == TripPurpose.UNCLASSIFIED)
                .mapToInt(Trip::getDistanceKm)
                .sum();
    }

    /**
     * Get total km for a vehicle in a tax year using odometer readings where available
     * Falls back to logged trip distance if odometer readings are not available
     */
    public DistanceCalculationResult getTotalKmForTaxYearWithSource(UUID vehicleId, int taxYear) {
        // Try to get opening and closing odometer readings for the tax year
        var openingOdometer = odometerVerificationRepository.findByVehicleYearAndType(
                vehicleId, taxYear, OdometerReadingType.OPENING);
        var closingOdometer = odometerVerificationRepository.findByVehicleYearAndType(
                vehicleId, taxYear, OdometerReadingType.CLOSING);

        if (openingOdometer.isPresent() && closingOdometer.isPresent()) {
            int openingValue = openingOdometer.get().getOdometerValue();
            int closingValue = closingOdometer.get().getOdometerValue();

            if (closingValue > openingValue) {
                int odometerTotalKm = closingValue - openingValue;
                
                // Calculate logged trip distance
                int businessKm = getBusinessKmForTaxYear(vehicleId, taxYear);
                int privateKm = getPrivateKmForTaxYear(vehicleId, taxYear);
                int unclassifiedKm = getUnclassifiedKmForTaxYear(vehicleId, taxYear);
                int loggedTripKm = businessKm + privateKm + unclassifiedKm;

                int unloggedKm = Math.max(0, odometerTotalKm - loggedTripKm);
                
                List<String> warnings = new ArrayList<>();
                if (unloggedKm > 0) {
                    warnings.add(String.format(
                            "The odometer indicates %d km, but logged trips total %d km. %d km were not assigned to a trip.",
                            odometerTotalKm, loggedTripKm, unloggedKm));
                }
                if (odometerTotalKm < loggedTripKm) {
                    warnings.add(String.format(
                            "The odometer total (%d km) is less than logged trip distance (%d km). This may indicate data entry errors.",
                            odometerTotalKm, loggedTripKm));
                }
                if (unclassifiedKm > 0) {
                    warnings.add(String.format("%d km of trips are unclassified.", unclassifiedKm));
                }

                return new DistanceCalculationResult(
                        odometerTotalKm,
                        businessKm,
                        privateKm,
                        unclassifiedKm,
                        unloggedKm,
                        DistanceSource.ODOMETER,
                        warnings
                );
            } else {
                // Odometer readings are inconsistent
                int businessKm = getBusinessKmForTaxYear(vehicleId, taxYear);
                int privateKm = getPrivateKmForTaxYear(vehicleId, taxYear);
                int unclassifiedKm = getUnclassifiedKmForTaxYear(vehicleId, taxYear);
                int loggedTripKm = businessKm + privateKm + unclassifiedKm;

                List<String> warnings = new ArrayList<>();
                warnings.add("Odometer readings are inconsistent with logged trip distances. Review the opening/closing odometer and trip entries.");
                if (unclassifiedKm > 0) {
                    warnings.add(String.format("%d km of trips are unclassified.", unclassifiedKm));
                }

                return new DistanceCalculationResult(
                        loggedTripKm,
                        businessKm,
                        privateKm,
                        unclassifiedKm,
                        0,
                        DistanceSource.LOGGED_TRIPS,
                        warnings
                );
            }
        }

        // Fallback to logged trip distance
        int businessKm = getBusinessKmForTaxYear(vehicleId, taxYear);
        int privateKm = getPrivateKmForTaxYear(vehicleId, taxYear);
        int unclassifiedKm = getUnclassifiedKmForTaxYear(vehicleId, taxYear);
        int loggedTripKm = businessKm + privateKm + unclassifiedKm;

        List<String> warnings = new ArrayList<>();
        warnings.add("Reliable tax-year opening and closing odometer readings were not found. The business percentage is based only on logged trips.");
        if (unclassifiedKm > 0) {
            warnings.add(String.format("%d km of trips are unclassified.", unclassifiedKm));
        }

        return new DistanceCalculationResult(
                loggedTripKm,
                businessKm,
                privateKm,
                unclassifiedKm,
                0,
                DistanceSource.LOGGED_TRIPS,
                warnings
        );
    }

    /**
     * Get total km for a vehicle in a tax year (legacy method for backward compatibility)
     */
    public Integer getTotalKmForTaxYear(UUID vehicleId, int taxYear) {
        return getTotalKmForTaxYearWithSource(vehicleId, taxYear).totalKm();
    }

    /**
     * Inner class to hold distance calculation results
     */
    public record DistanceCalculationResult(
            int totalKm,
            int businessKm,
            int privateKm,
            int unclassifiedLoggedKm,
            int unloggedKm,
            DistanceSource distanceSource,
            List<String> warnings
    ) {}

    /**
     * Check if trip is SARS-compliant (has all required fields)
     */
    public boolean isSarsCompliant(UUID tripId, UUID userId, UserRole role) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found: " + tripId));
        if (role == UserRole.DRIVER) {
            if (!trip.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Trip not found: " + tripId);
            }
        }

        return trip.getTripDate() != null &&
               trip.getStartOdometer() != null &&
               trip.getEndOdometer() != null &&
               trip.getDistanceKm() != null &&
               trip.getPurpose() != null &&
               trip.getStartLocation() != null && !trip.getStartLocation().isEmpty() &&
               trip.getEndLocation() != null && !trip.getEndLocation().isEmpty() &&
               trip.getReasonForTrip() != null && !trip.getReasonForTrip().isEmpty();
    }

    /**
     * Get all non-compliant trips for SARS audit
     */
    public List<TripDTO> getNonCompliantTrips(UUID organizationId, int taxYear, UUID userId, UserRole role) {
        List<Trip> trips;
        if (role == UserRole.DRIVER) {
            trips = tripRepository.findByOrganizationIdAndUserIdWithVehicle(organizationId, userId);
        } else {
            trips = tripRepository.findByOrganizationIdAndUserIdWithVehicle(organizationId, userId);
        }

        return trips.stream()
                .filter(trip -> trip.getTripDate().getYear() == taxYear)
                .filter(trip -> !isSarsCompliant(trip.getId(), userId, role))
                .map(tripMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get trips by vehicle with SARS business km calculated
     */
    public List<TripDTO> getSarsLogbookEntries(UUID vehicleId, int taxYear, UUID userId, UserRole role) {
        if (role == UserRole.DRIVER) {
            Vehicle vehicle = vehicleRepository.findById(vehicleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
            if (vehicle.getAssignedDriver() == null || !vehicle.getAssignedDriver().getId().equals(userId)) {
                throw new ResourceNotFoundException("Vehicle not found");
            }
        }
        List<Trip> trips = tripRepository.findByVehicleIdWithVehicle(vehicleId);

        return trips.stream()
                .filter(trip -> trip.getTripDate().getYear() == taxYear)
                .map(tripMapper::toDTO)
                .collect(Collectors.toList());
    }
}
