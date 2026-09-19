package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.AddressDTO;
import za.co.fleetexpense.dto.SimpleAddressRequest;
import za.co.fleetexpense.entity.Address;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.UserProfile;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.mapper.AddressMapper;
import za.co.fleetexpense.repository.AddressRepository;
import za.co.fleetexpense.repository.UserProfileRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserProfileRepository userProfileRepository;
    private final AddressMapper addressMapper;

    @Transactional
    public AddressDTO createAddress(AddressDTO dto, User currentUser) {
        UserProfile userProfile = userProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        Address address = addressMapper.toEntity(dto);
        address.setUserProfile(userProfile);
        Address saved = addressRepository.save(address);
        return addressMapper.toDto(saved);
    }

    @Transactional
    public AddressDTO createSimpleAddress(SimpleAddressRequest request, User currentUser) {
        UserProfile userProfile = userProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        // Map simple address to detailed address entity
        Address address = new Address();
        address.setUserProfile(userProfile);
        
        // Parse addressLine1 into street number and street name
        String[] addressParts = parseAddressLine(request.addressLine1());
        address.setStreetNumber(addressParts[0]);
        address.setStreetName(addressParts[1]);
        
        address.setFlatUnitNumber(request.addressLine2());
        address.setSuburb(request.suburb());
        address.setCityTown(request.city());
        address.setProvince(request.province());
        address.setPostalCode(request.postalCode());
        address.setCountry(request.country());
        
        // Set recipient full name - use user's name if available, otherwise use email
        String recipientName = currentUser.getFirstName() + " " + currentUser.getLastName();
        if (recipientName.trim().equals("null null") || recipientName.trim().isEmpty()) {
            recipientName = currentUser.getEmail();
        }
        address.setRecipientFullName(recipientName);
        
        Address saved = addressRepository.save(address);
        return addressMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public AddressDTO getAddress(UUID userId, User currentUser) {
        UserProfile userProfile = userProfileRepository.findByUserId(currentUser.getId()).orElse(null);

        if (userProfile == null) {
            return null;
        }

        Address address = addressRepository.findByUserProfileId(userProfile.getId())
                .orElse(null);

        return address != null ? addressMapper.toDto(address) : null;
    }

    @Transactional
    public AddressDTO updateAddress(UUID addressId, AddressDTO dto, User currentUser) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));

        Address updated = addressMapper.toEntity(dto);
        updated.setId(address.getId());
        updated.setUserProfile(address.getUserProfile());
        Address saved = addressRepository.save(updated);
        return addressMapper.toDto(saved);
    }

    @Transactional
    public AddressDTO updateSimpleAddress(UUID addressId, SimpleAddressRequest request, User currentUser) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));

        // Map simple address to detailed address entity
        String[] addressParts = parseAddressLine(request.addressLine1());
        address.setStreetNumber(addressParts[0]);
        address.setStreetName(addressParts[1]);
        
        address.setFlatUnitNumber(request.addressLine2());
        address.setSuburb(request.suburb());
        address.setCityTown(request.city());
        address.setProvince(request.province());
        address.setPostalCode(request.postalCode());
        address.setCountry(request.country());
        
        Address saved = addressRepository.save(address);
        return addressMapper.toDto(saved);
    }

    private String[] parseAddressLine(String addressLine) {
        if (addressLine == null || addressLine.trim().isEmpty()) {
            return new String[]{"", ""};
        }
        
        // Try to split by first space to separate street number from street name
        String[] parts = addressLine.trim().split("\\s+", 2);
        if (parts.length == 1) {
            // If no space found, treat entire line as street name
            return new String[]{"", parts[0]};
        }
        return parts;
    }
}
