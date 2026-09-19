package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.enums.EntryType;
import za.co.fleetexpense.entity.enums.ImageType;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.ValidationException;
import za.co.fleetexpense.repository.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EntryImageService {

    private final EntryImageRepository entryImageRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    public List<EntryImage> getByEntry(EntryType entryType, UUID entryId) {
        return entryImageRepository.findByEntry(entryType, entryId);
    }

    public boolean hasImages(EntryType entryType, UUID entryId) {
        List<EntryImage> images = entryImageRepository.findByEntry(entryType, entryId);
        return images != null && !images.isEmpty();
    }

    public EntryImage getById(UUID id) {
        return entryImageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Entry image not found: " + id));
    }

    @Transactional
    public EntryImage uploadImage(EntryType entryType, UUID entryId, MultipartFile file,
                                   String description, UUID organizationId, UUID userId) {
        return uploadImage(entryType, entryId, file, description, organizationId, userId, ImageType.RECEIPT);
    }

    @Transactional
    public EntryImage uploadImage(EntryType entryType, UUID entryId, MultipartFile file,
                                   String description, UUID organizationId, UUID userId, String imageType) {
        ImageType type;
        try {
            type = ImageType.valueOf(imageType);
        } catch (IllegalArgumentException e) {
            type = ImageType.RECEIPT;
        }
        return uploadImage(entryType, entryId, file, description, organizationId, userId, type);
    }

    @Transactional
    public EntryImage uploadImage(EntryType entryType, UUID entryId, MultipartFile file,
                                   String description, UUID organizationId, UUID userId, ImageType imageType) {
        log.info("Uploading image for {} {}: file={}, orgId={}, userId={}, imageType={}", entryType, entryId,
                 file != null ? file.getOriginalFilename() : "null", organizationId, userId, imageType);

        if (file == null || file.isEmpty()) {
            throw new ValidationException("File cannot be empty");
        }

        try {
            String imageUrl;
            String imageKey;
            
            // Use local storage only (OCI disabled due to dependency conflicts)
            StorageService.UploadResult result = storageService.uploadFile(file, "expenses-receipts", userId);
            imageUrl = result.getUrl();
            imageKey = result.getKey();
            log.info("Image stored locally with key: {}", imageKey);

            EntryImage image = EntryImage.builder()
                    .organization(organizationRepository.findById(organizationId)
                            .orElseThrow(() -> new ResourceNotFoundException("Organization not found")))
                    .entryType(entryType)
                    .entryId(entryId)
                    .imageUrl(imageUrl)
                    .imageKey(imageKey)
                    .imageType(imageType)
                    .fileName(file.getOriginalFilename())
                    .fileSizeBytes(file.getSize())
                    .mimeType(file.getContentType())
                    .description(description)
                    .uploadedByUser(userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found")))
                    .isLocked(false)
                    .build();

            EntryImage saved = entryImageRepository.save(image);
            log.info("Uploaded entry image {} for {} {}", saved.getId(), entryType, entryId);
            return saved;
        } catch (Exception e) {
            log.error("Failed to upload image for {} {}: {}", entryType, entryId, e.getMessage(), e);
            throw new RuntimeException("Failed to upload image: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteImage(UUID id) {
        EntryImage image = getById(id);

        if (Boolean.TRUE.equals(image.getIsLocked())) {
            throw new ValidationException("Cannot delete locked image");
        }

        // Delete from local storage (OCI disabled)
        if (image.getImageKey() != null) {
            try {
                storageService.deleteFile("expenses-receipts", image.getImageKey());
            } catch (Exception e) {
                log.warn("Failed to delete from local storage (file may not exist locally): {}", e.getMessage());
            }
        }

        entryImageRepository.delete(image);
        log.info("Deleted entry image {}", id);
    }

    @Transactional
    public EntryImage toggleLock(UUID id, boolean locked, UUID userId, String reason) {
        EntryImage image = getById(id);

        image.setIsLocked(locked);
        if (locked) {
            image.setLockedAt(OffsetDateTime.now());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            image.setLockedByUser(user);
            image.setLockedReason(reason);
        } else {
            image.setLockedAt(null);
            image.setLockedByUser(null);
            image.setLockedReason(null);
        }

        EntryImage saved = entryImageRepository.save(image);
        log.info("{} entry image {}", locked ? "Locked" : "Unlocked", id);
        return saved;
    }
}
