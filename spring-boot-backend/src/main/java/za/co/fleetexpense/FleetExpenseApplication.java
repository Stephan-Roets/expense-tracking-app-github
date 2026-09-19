package za.co.fleetexpense;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Fleet Expense API - Spring Boot Application
 * 
 * Vehicle expense tracking and SARS tax compliance system
 * for South African fleet management.
 * 
 * @author Fleet Expense Team
 * @version 1.0.0
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EnableAsync
public class FleetExpenseApplication {

    public static void main(String[] args) {
        SpringApplication.run(FleetExpenseApplication.class, args);
    }
}
