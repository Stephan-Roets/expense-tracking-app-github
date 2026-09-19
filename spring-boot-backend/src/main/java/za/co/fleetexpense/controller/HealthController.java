package za.co.fleetexpense.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "fleet-expense-api");

        // Check database connectivity
        try (Connection connection = dataSource.getConnection()) {
            response.put("database", "UP");
            response.put("database_url", connection.getMetaData().getURL());
        } catch (Exception e) {
            response.put("database", "DOWN");
            response.put("database_error", e.getMessage());
        }

        return ResponseEntity.ok(response);
    }
}
