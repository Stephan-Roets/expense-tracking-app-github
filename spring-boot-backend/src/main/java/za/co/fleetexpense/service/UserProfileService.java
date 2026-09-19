package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.dto.AddressCreateRequest;
import za.co.fleetexpense.dto.AddressDTO;
import za.co.fleetexpense.dto.UserProfileCreateRequest;
import za.co.fleetexpense.dto.UserProfileDTO;
import za.co.fleetexpense.entity.Address;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.UserProfile;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.mapper.AddressMapper;
import za.co.fleetexpense.mapper.UserProfileMapper;
import za.co.fleetexpense.repository.AddressRepository;
import za.co.fleetexpense.repository.UserProfileRepository;
import za.co.fleetexpense.util.FleetModeGuard;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository profileRepository;
    private final AddressRepository addressRepository;
    private final UserProfileMapper profileMapper;
    private final AddressMapper addressMapper;

    @Transactional
    public UserProfileDTO createProfile(UserProfileCreateRequest request, User currentUser) {
        if (profileRepository.findByUserId(currentUser.getId()).isPresent()) {
            throw new ValidationException("User profile already exists");
        }

        UserProfile profile = UserProfile.builder()
                .user(currentUser)
                .idNumber(request.idNumber())
                .homePhone(request.homePhone())
                .mobilePhone(request.mobilePhone())
                .driversLicenseNumber(request.driversLicenseNumber())
                .driverLicenseFrontUrl(request.driversLicenseFrontUrl())
                .driverLicenseBackUrl(request.driversLicenseBackUrl())
                .driverLicenseExpiry(request.driversLicenseExpiry())
                .build();

        UserProfile savedProfile = profileRepository.save(profile);

        if (request.address() != null) {
            Address address = Address.builder()
                    .userProfile(savedProfile)
                    .recipientFullName(request.address().recipientFullName())
                    .streetNumber(request.address().streetNumber())
                    .streetName(request.address().streetName())
                    .flatUnitNumber(request.address().flatUnitNumber())
                    .buildingName(request.address().buildingName())
                    .suburb(request.address().suburb())
                    .cityTown(request.address().cityTown())
                    .province(request.address().province())
                    .postalCode(request.address().postalCode())
                    .build();
            addressRepository.save(address);
        }

        return enrichWithAddress(profileMapper.toDto(savedProfile), savedProfile);
    }

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(UUID userId, User currentUser) {
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);

        if (profile == null) {
            return null;
        }

        // Only check organization mode if profile exists and belongs to an organization
        if (currentUser.getOrganization() != null && profile.getUser().getOrganization() != null) {
            if (!profile.getUser().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
                throw new ValidationException("Profile does not belong to your organization");
            }
        }

        return enrichWithAddress(profileMapper.toDto(profile), profile);
    }

    @Transactional
    public UserProfileDTO updateProfile(UUID userId, UserProfileCreateRequest request, User currentUser) {
        UserProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));

        // Only check organization mode if profile exists and belongs to an organization
        if (currentUser.getOrganization() != null && profile.getUser().getOrganization() != null) {
            if (!profile.getUser().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
                throw new ValidationException("Profile does not belong to your organization");
            }
        }

        profile.setIdNumber(request.idNumber());
        profile.setHomePhone(request.homePhone());
        profile.setMobilePhone(request.mobilePhone());
        profile.setDriversLicenseNumber(request.driversLicenseNumber());
        profile.setDriverLicenseFrontUrl(request.driversLicenseFrontUrl());
        profile.setDriverLicenseBackUrl(request.driversLicenseBackUrl());
        profile.setDriverLicenseExpiry(request.driversLicenseExpiry());

        UserProfile savedProfile = profileRepository.save(profile);

        if (request.address() != null) {
            Address address = addressRepository.findByUserProfileId(savedProfile.getId())
                    .orElse(new Address());
            address.setUserProfile(savedProfile);
            address.setRecipientFullName(request.address().recipientFullName());
            address.setStreetNumber(request.address().streetNumber());
            address.setStreetName(request.address().streetName());
            address.setFlatUnitNumber(request.address().flatUnitNumber());
            address.setBuildingName(request.address().buildingName());
            address.setSuburb(request.address().suburb());
            address.setCityTown(request.address().cityTown());
            address.setProvince(request.address().province());
            address.setPostalCode(request.address().postalCode());
            addressRepository.save(address);
        }

        return enrichWithAddress(profileMapper.toDto(savedProfile), savedProfile);
    }

    private UserProfileDTO enrichWithAddress(UserProfileDTO dto, UserProfile profile) {
        Address address = addressRepository.findByUserProfileId(profile.getId()).orElse(null);
        AddressDTO addressDTO = address != null ? addressMapper.toDto(address) : null;
        return new UserProfileDTO(
                dto.id(), dto.userId(), dto.idNumber(), dto.homePhone(), dto.mobilePhone(),
                dto.driversLicenseNumber(), dto.driversLicenseFrontUrl(), dto.driversLicenseBackUrl(), dto.driversLicenseExpiry(),
                addressDTO, dto.createdAt(), dto.updatedAt()
        );
    }
}
