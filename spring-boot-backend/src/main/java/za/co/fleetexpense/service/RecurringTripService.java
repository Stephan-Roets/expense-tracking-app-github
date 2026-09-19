package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.RecurringTripCreateRequest;
import za.co.fleetexpense.dto.RecurringTripDTO;
import za.co.fleetexpense.entity.RecurringTrip;
import za.co.fleetexpense.entity.Trip;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.Vehicle;
import za.co.fleetexpense.entity.enums.TripPurpose;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.RecurringTripMapper;
import za.co.fleetexpense.repository.OrganizationRepository;
import za.co.fleetexpense.repository.RecurringTripRepository;
import za.co.fleetexpense.repository.TripRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.repository.VehicleRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringTripService {

    private final RecurringTripRepository recurringTripRepository;
    private final OrganizationRepository organizationRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final RecurringTripMapper recurringTripMapper;
    private final TripService tripService;
    private final TripRepository tripRepository;

    public List<RecurringTripDTO> getAllByOrganization(UUID organizationId) {
        List<RecurringTrip> recurringTrips = recurringTripRepository.findByOrganizationId(organizationId);
        return recurringTrips.stream()
                .map(recurringTripMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RecurringTripDTO> getByVehicle(UUID organizationId, UUID vehicleId) {
        List<RecurringTrip> recurringTrips = recurringTripRepository.findByOrganizationIdAndVehicleId(organizationId, vehicleId);
        // Initialize lazy-loaded entities to avoid LazyInitializationException
        recurringTrips.forEach(trip -> {
            if (trip.getVehicle() != null) {
                org.hibernate.Hibernate.initialize(trip.getVehicle());
            }
            if (trip.getUser() != null) {
                org.hibernate.Hibernate.initialize(trip.getUser());
            }
        });
        return recurringTrips.stream()
                .map(recurringTripMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RecurringTripDTO> getActiveByVehicle(UUID organizationId, UUID vehicleId) {
        List<RecurringTrip> recurringTrips = recurringTripRepository.findActiveByOrganizationAndVehicle(organizationId, vehicleId);
        // Initialize lazy-loaded entities to avoid LazyInitializationException
        recurringTrips.forEach(trip -> {
            if (trip.getVehicle() != null) {
                org.hibernate.Hibernate.initialize(trip.getVehicle());
            }
            if (trip.getUser() != null) {
                org.hibernate.Hibernate.initialize(trip.getUser());
            }
        });
        return recurringTrips.stream()
                .map(recurringTripMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public RecurringTripDTO create(RecurringTripCreateRequest request, UUID organizationId, UUID userId) {
        // Validate entities exist
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found"));
        
        userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate recurrence settings
        if (Boolean.TRUE.equals(request.getIsRecurring())) {
            if (request.getRecurrenceDays() == null || request.getRecurrenceDays().trim().isEmpty()) {
                throw new ValidationException("Recurrence days are required when trip is recurring");
            }
            if (request.getRecurrenceStartDate() == null) {
                throw new ValidationException("Recurrence start date is required when trip is recurring");
            }
            validateRecurrenceDays(request.getRecurrenceDays());
        }

        // Map request to entity
        RecurringTrip recurringTrip = recurringTripMapper.toEntity(request);
        recurringTrip.setOrganization(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found")));

        RecurringTrip saved = recurringTripRepository.save(recurringTrip);
        log.info("Created recurring trip {} for vehicle {}", saved.getId(), vehicle.getId());
        return recurringTripMapper.toDTO(saved);
    }

    @Transactional
    public void generateTripsFromRecurring(UUID organizationId, LocalDate date) {
        List<RecurringTrip> recurringTrips = recurringTripRepository.findActiveRecurringTripsForDate(organizationId, date);
        
        // Filter trips that should be generated
        List<RecurringTrip> tripsToGenerate = recurringTrips.stream()
                .filter(rt -> shouldGenerateTripForDate(rt, date))
                .toList();
        
        if (tripsToGenerate.isEmpty()) {
            return;
        }
        
        // Group by vehicle to handle each vehicle's trips separately
        java.util.Map<UUID, List<RecurringTrip>> tripsByVehicle = tripsToGenerate.stream()
                .collect(java.util.stream.Collectors.groupingBy(rt -> rt.getVehicle().getId()));
        
        // Process each vehicle separately
        for (java.util.Map.Entry<UUID, List<RecurringTrip>> entry : tripsByVehicle.entrySet()) {
            UUID vehicleId = entry.getKey();
            List<RecurringTrip> vehicleRecurringTrips = entry.getValue();
            
            // Get existing trips for this vehicle on this date
            List<Trip> existingTrips = tripRepository.findByVehicleIdAndDateWithStartTime(vehicleId, date);
            
            // Sort recurring trips by start time
            vehicleRecurringTrips.sort((a, b) -> {
                if (a.getStartTime() == null && b.getStartTime() == null) return 0;
                if (a.getStartTime() == null) return 1;
                if (b.getStartTime() == null) return -1;
                return a.getStartTime().compareTo(b.getStartTime());
            });
            
            // Generate trips with proper odometer tracking
            generateTripsForVehicle(vehicleId, vehicleRecurringTrips, existingTrips, date);
        }
    }
    
    private void generateTripsForVehicle(UUID vehicleId, List<RecurringTrip> recurringTrips, List<Trip> existingTrips, LocalDate date) {
        // Get vehicle's current odometer
        Vehicle vehicle = vehicleRepository.findById(vehicleId).orElse(null);
        Integer currentOdometer = vehicle != null ? vehicle.getCurrentOdometer() : 0;
        if (currentOdometer == null) {
            currentOdometer = 0;
        }
        
        // If there are existing trips, use the last trip's end odometer as starting point
        if (!existingTrips.isEmpty()) {
            // Sort existing trips by start time to find the last one
            existingTrips.sort((a, b) -> {
                if (a.getStartTime() == null && b.getStartTime() == null) return 0;
                if (a.getStartTime() == null) return 1;
                if (b.getStartTime() == null) return -1;
                return a.getStartTime().compareTo(b.getStartTime());
            });
            
            // Use the last trip's end odometer as the starting point
            Trip lastTrip = existingTrips.get(existingTrips.size() - 1);
            if (lastTrip.getEndOdometer() != null) {
                currentOdometer = lastTrip.getEndOdometer();
            }
        }
        
        // Generate each recurring trip
        for (RecurringTrip recurringTrip : recurringTrips) {
            // Calculate average distance from historical trips for this route
            Integer estimatedDistance = calculateAverageDistanceForRoute(vehicleId, recurringTrip.getStartLocation(), recurringTrip.getEndLocation());
            
            // Generate trip with current odometer
            generateTripFromRecurring(recurringTrip, date, currentOdometer, estimatedDistance);
            
            // Update odometer for next trip
            currentOdometer += estimatedDistance;
        }
    }
    
    private Integer calculateAverageDistanceForRoute(UUID vehicleId, String startLocation, String endLocation) {
        List<Trip> historicalTrips = tripRepository.findByVehicleAndRoute(vehicleId, startLocation, endLocation);
        
        if (historicalTrips.isEmpty()) {
            return 20; // Default estimate if no historical data
        }
        
        // Calculate average distance from historical trips
        int totalDistance = 0;
        int count = 0;
        
        for (Trip trip : historicalTrips) {
            if (trip.getStartOdometer() != null && trip.getEndOdometer() != null) {
                int distance = trip.getEndOdometer() - trip.getStartOdometer();
                if (distance > 0) {
                    totalDistance += distance;
                    count++;
                }
            }
        }
        
        if (count == 0) {
            return 20; // Default estimate if no valid distances
        }
        
        return totalDistance / count;
    }

    private boolean shouldGenerateTripForDate(RecurringTrip recurringTrip, LocalDate date) {
        // Check if trip already exists for this specific recurring template on this date
        List<Trip> existingTrips = tripRepository.findByVehicleIdAndDate(recurringTrip.getVehicle().getId(), date);
        for (Trip existingTrip : existingTrips) {
            // Check if a trip with same start/end location already exists (likely from this recurring template)
            if (existingTrip.getStartLocation().equals(recurringTrip.getStartLocation()) &&
                existingTrip.getEndLocation().equals(recurringTrip.getEndLocation())) {
                return false;
            }
        }

        // Check if date matches recurrence days
        if (Boolean.TRUE.equals(recurringTrip.getIsRecurring())) {
            DayOfWeek dayOfWeek = date.getDayOfWeek();
            String dayName = dayOfWeek.name().substring(0, 3).toUpperCase(); // MON, TUE, etc.
            
            // Check day of week
            boolean matchesDayOfWeek = recurringTrip.getRecurrenceDays() != null && 
                recurringTrip.getRecurrenceDays().contains(dayName);
            
            // Check day of month if specified
            boolean matchesDayOfMonth = false;
            if (recurringTrip.getRecurrenceDaysOfMonth() != null && 
                !recurringTrip.getRecurrenceDaysOfMonth().trim().isEmpty()) {
                int dayOfMonth = date.getDayOfMonth();
                String[] daysOfMonth = recurringTrip.getRecurrenceDaysOfMonth().split(",");
                for (String day : daysOfMonth) {
                    if (day.trim().equals(String.valueOf(dayOfMonth))) {
                        matchesDayOfMonth = true;
                        break;
                    }
                }
            }
            
            // If both are specified, both must match. If only one is specified, that one must match.
            if (recurringTrip.getRecurrenceDaysOfMonth() != null && 
                !recurringTrip.getRecurrenceDaysOfMonth().trim().isEmpty()) {
                return matchesDayOfWeek && matchesDayOfMonth;
            }
            return matchesDayOfWeek;
        }

        return false;
    }

    @Transactional
    protected void generateTripFromRecurring(RecurringTrip recurringTrip, LocalDate date, Integer odometer, Integer estimatedDistance) {
        // Create trip entity from recurring template
        Trip trip = Trip.builder()
                .vehicle(recurringTrip.getVehicle())
                .user(recurringTrip.getUser())
                .organization(recurringTrip.getOrganization())
                .tripDate(date)
                .startOdometer(odometer)
                .endOdometer(odometer + estimatedDistance) // Use estimated distance
                .purpose(recurringTrip.getPurpose() != null ? recurringTrip.getPurpose() : TripPurpose.BUSINESS)
                .startLocation(recurringTrip.getStartLocation())
                .endLocation(recurringTrip.getEndLocation())
                .routeDescription(recurringTrip.getRouteDescription())
                .customerClientName(recurringTrip.getCustomerClientName())
                .reasonForTrip(recurringTrip.getReasonForTrip())
                .tollCostsZar(recurringTrip.getDefaultTollCostsZar() != null ? recurringTrip.getDefaultTollCostsZar() : java.math.BigDecimal.ZERO)
                .parkingCostsZar(recurringTrip.getDefaultParkingCostsZar() != null ? recurringTrip.getDefaultParkingCostsZar() : java.math.BigDecimal.ZERO)
                .build();

        saveTripWithTime(trip, recurringTrip);
        log.info("Generated trip {} from recurring template {} for date {} with odometer {} and estimated distance {}", trip.getId(), recurringTrip.getId(), date, odometer, estimatedDistance);
    }
    
    private void saveTripWithTime(Trip trip, RecurringTrip recurringTrip) {
        // Parse time strings from recurring trip if available
        if (recurringTrip.getStartTime() != null) {
            try {
                trip.setStartTime(java.time.LocalTime.parse(recurringTrip.getStartTime()));
            } catch (Exception e) {
                log.warn("Failed to parse start time: {}", recurringTrip.getStartTime());
            }
        }
        if (recurringTrip.getEndTime() != null) {
            try {
                trip.setEndTime(java.time.LocalTime.parse(recurringTrip.getEndTime()));
            } catch (Exception e) {
                log.warn("Failed to parse end time: {}", recurringTrip.getEndTime());
            }
        }
        
        tripRepository.save(trip);
    }

    private void validateRecurrenceDays(String recurrenceDays) {
        List<String> validDays = Arrays.asList("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");
        String[] days = recurrenceDays.split(",");
        
        for (String day : days) {
            String trimmedDay = day.trim().toUpperCase();
            if (!validDays.contains(trimmedDay)) {
                throw new ValidationException("Invalid recurrence day: " + trimmedDay + ". Valid days are: MON, TUE, WED, THU, FRI, SAT, SUN");
            }
        }
    }

    public RecurringTripDTO getById(UUID id) {
        RecurringTrip recurringTrip = recurringTripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring trip not found: " + id));
        return recurringTripMapper.toDTO(recurringTrip);
    }

    @Transactional
    public void delete(UUID id) {
        RecurringTrip recurringTrip = recurringTripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recurring trip not found: " + id));
        recurringTripRepository.delete(recurringTrip);
        log.info("Deleted recurring trip {}", id);
    }
}
