package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.ReportExport;
import za.co.fleetexpense.enums.ReportExportStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportExportRepository extends JpaRepository<ReportExport, UUID> {

    List<ReportExport> findByOrganizationId(UUID organizationId);

    List<ReportExport> findByOrganizationIdAndStatus(UUID organizationId, ReportExportStatus status);

    Optional<ReportExport> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<ReportExport> findByStatus(ReportExportStatus status);
}
