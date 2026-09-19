package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.ExportReport;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExportReportRepository extends JpaRepository<ExportReport, UUID> {
    List<ExportReport> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    List<ExportReport> findByOrganizationIdAndStatusOrderByCreatedAtDesc(UUID organizationId, String status);
    List<ExportReport> findByRequestedByIdOrderByCreatedAtDesc(UUID userId);
}
