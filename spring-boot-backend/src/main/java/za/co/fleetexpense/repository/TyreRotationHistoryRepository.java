package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.TyreRotationHistory;

import java.util.List;
import java.util.UUID;

@Repository
public interface TyreRotationHistoryRepository extends JpaRepository<TyreRotationHistory, UUID> {

    List<TyreRotationHistory> findByTrackingId(UUID trackingId);

    List<TyreRotationHistory> findByTrackingIdOrderByRotationDateDesc(UUID trackingId);
}
