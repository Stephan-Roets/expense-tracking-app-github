package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ImageStorageService {

    private final StorageService storageService;

    public String storeImage(MultipartFile file, UUID userId) {
        StorageService.UploadResult result = storageService.uploadFile(file, "entry-images", userId);
        return result.getUrl();
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl != null && imageUrl.contains("/")) {
            String key = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
            storageService.deleteFile("entry-images", key);
        }
    }
}
