package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.Permission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByOrganizationIdAndPermissionTypeAndPermissionKeyAndUserRole(
            UUID organizationId,
            String permissionType,
            String permissionKey,
            String userRole
    );

    Optional<Permission> findByUserIdAndPermissionTypeAndPermissionKeyAndUserRole(
            UUID userId,
            String permissionType,
            String permissionKey,
            String userRole
    );

    List<Permission> findByOrganizationIdAndPermissionType(
            UUID organizationId,
            String permissionType
    );

    List<Permission> findByUserIdAndPermissionType(
            UUID userId,
            String permissionType
    );

    List<Permission> findByOrganizationId(UUID organizationId);

    List<Permission> findByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM Permission p WHERE p.organizationId = :organizationId AND p.permissionType = :permissionType AND p.permissionKey = :permissionKey AND p.userRole = :userRole")
    void deleteByOrganizationIdAndPermissionTypeAndPermissionKeyAndUserRole(
            @Param("organizationId") UUID organizationId,
            @Param("permissionType") String permissionType,
            @Param("permissionKey") String permissionKey,
            @Param("userRole") String userRole
    );

    @Modifying
    @Query("DELETE FROM Permission p WHERE p.userId = :userId AND p.permissionType = :permissionType AND p.permissionKey = :permissionKey AND p.userRole = :userRole")
    void deleteByUserIdAndPermissionTypeAndPermissionKeyAndUserRole(
            @Param("userId") UUID userId,
            @Param("permissionType") String permissionType,
            @Param("permissionKey") String permissionKey,
            @Param("userRole") String userRole
    );

    @Modifying
    @Query("DELETE FROM Permission p WHERE p.organizationId = :organizationId")
    void deleteByOrganizationId(@Param("organizationId") UUID organizationId);

    @Modifying
    @Query("DELETE FROM Permission p WHERE p.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
