package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.UserAssistant;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserAssistantRepository extends JpaRepository<UserAssistant, UUID> {

    Optional<UserAssistant> findByOwnerIdAndAssistantId(UUID ownerId, UUID assistantId);

    List<UserAssistant> findByOwnerId(UUID ownerId);

    List<UserAssistant> findByAssistantId(UUID assistantId);

    @Query("SELECT ua FROM UserAssistant ua WHERE ua.ownerId = :ownerId AND ua.assistantRole = :assistantRole")
    List<UserAssistant> findByOwnerIdAndAssistantRole(@Param("ownerId") UUID ownerId, @Param("assistantRole") String assistantRole);

    boolean existsByOwnerIdAndAssistantId(UUID ownerId, UUID assistantId);
}
