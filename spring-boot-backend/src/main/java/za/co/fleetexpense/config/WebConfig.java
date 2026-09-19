package za.co.fleetexpense.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${storage.base-path:/app/storage}")
    private String uploadDir;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // Disable trailing slash matching to avoid conflicts
        configurer.setUseTrailingSlashMatch(false);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve uploaded files from the local "uploads" directory
        // This is the ONLY static resource mapping - all /api/** requests go to controllers
        // Use absolute path to ensure files are accessible in production
        String absoluteUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize().toString();
        System.out.println("=== Static resource handler configured ===");
        System.out.println("Upload dir: " + uploadDir);
        System.out.println("Absolute path: " + absoluteUploadPath);
        System.out.println("Resource location: file:" + absoluteUploadPath + "/");
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absoluteUploadPath + "/");
    }
}
