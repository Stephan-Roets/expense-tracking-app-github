package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.dto.ChangePasswordRequest;
import za.co.fleetexpense.dto.UpdateProfileRequest;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.UserRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StorageService storageService;

    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public User updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = getById(userId);
        
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhone(request.getPhone());
        user.setEmployeeNumber(request.getEmployeeNumber());
        user.setDriversLicenseNumber(request.getDriversLicenseNumber());
        user.setDriversLicenseExpiry(request.getDriversLicenseExpiry());
        
        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = getById(userId);
        
        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ValidationException("Current password is incorrect");
        }
        
        // Encode and save new password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChanged(true);
        userRepository.save(user);
    }

    @Transactional
    public void deactivateUser(UUID userId) {
        User user = getById(userId);
        user.setIsActive(false);
        userRepository.save(user);
    }

    @Transactional
    public String uploadProfilePhoto(UUID userId, MultipartFile file) {
        User user = getById(userId);
        
        // Upload photo to storage
        StorageService.UploadResult result = storageService.uploadFile(
            file, 
            "profile-photos", 
            userId
        );
        
        // Update user with new photo URL
        user.setProfilePhotoUrl(result.getUrl());
        userRepository.save(user);
        
        return result.getUrl();
    }

    @Transactional
    public void removeProfilePhoto(UUID userId) {
        User user = getById(userId);
        
        // Delete old photo if exists
        if (user.getProfilePhotoUrl() != null) {
            // Extract key from URL and delete from storage
            String key = extractKeyFromUrl(user.getProfilePhotoUrl());
            if (key != null) {
                storageService.deleteFile("profile-photos", key);
            }
        }
        
        // Clear photo URL
        user.setProfilePhotoUrl(null);
        userRepository.save(user);
    }

    private String extractKeyFromUrl(String url) {
        try {
            // URL format: https://domain/api/v1/storage/folder/key
            String[] parts = url.split("/api/v1/storage/");
            if (parts.length > 1) {
                String[] folderAndKey = parts[1].split("/", 2);
                if (folderAndKey.length > 1) {
                    return folderAndKey[1];
                }
            }
        } catch (Exception e) {
            // Return null if parsing fails
        }
        return null;
    }
}
