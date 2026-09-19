package za.co.fleetexpense.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class EnvironmentValidationConfig {

    private final Environment environment;

    // Critical environment variables that must be present
    private static final List<String> REQUIRED_VARS = Arrays.asList(
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USERNAME",
        "DB_PASSWORD",
        "JWT_SECRET",
        "CORS_ALLOWED_ORIGINS"
    );

    public EnvironmentValidationConfig(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateEnvironment() {
        List<String> missingVars = REQUIRED_VARS.stream()
            .filter(var -> {
                String value = environment.getProperty(var);
                return value == null || value.isBlank();
            })
            .toList();

        if (!missingVars.isEmpty()) {
            String errorMessage = "CRITICAL: Missing required environment variables: " + String.join(", ", missingVars);
            System.err.println(errorMessage);
            throw new IllegalStateException(errorMessage);
        }

        System.out.println("Environment validation passed. All required variables are present.");
    }
}
