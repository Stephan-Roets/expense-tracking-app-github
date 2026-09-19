package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.enums.UserRole;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndOrganizationId(String email, UUID organizationId);
    Optional<User> findByEmailVerificationToken(String token);
    List<User> findByOrganizationIdAndIsActiveTrue(UUID organizationId);
    List<User> findByOrganizationIdAndRoleAndIsActiveTrue(UUID organizationId, UserRole role);

    @Modifying
    @Query("DELETE FROM User u WHERE u.emailVerified = false AND u.createdAt < :cutoffTime")
    int deleteByEmailVerifiedFalseAndCreatedAtBefore(@Param("cutoffTime") OffsetDateTime cutoffTime);

    @Query("SELECT u.id FROM User u WHERE u.emailVerified = false AND u.createdAt < :cutoffTime")
    List<UUID> findIdsByEmailVerifiedFalseAndCreatedAtBefore(@Param("cutoffTime") OffsetDateTime cutoffTime);
}
