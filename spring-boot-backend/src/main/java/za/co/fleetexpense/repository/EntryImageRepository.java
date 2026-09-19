package za.co.fleetexpense.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import za.co.fleetexpense.entity.EntryImage;
import za.co.fleetexpense.entity.enums.EntryType;

import java.util.List;
import java.util.UUID;

@Repository
public interface EntryImageRepository extends JpaRepository<EntryImage, UUID> {

    List<EntryImage> findByOrganizationId(UUID organizationId);

    @Query("SELECT ei FROM EntryImage ei WHERE ei.entryType = :entryType AND ei.entryId = :entryId")
    List<EntryImage> findByEntry(@Param("entryType") EntryType entryType, @Param("entryId") UUID entryId);

    List<EntryImage> findByUploadedByUserId(UUID userId);

    @Query("SELECT ei FROM EntryImage ei WHERE ei.organization.id = :orgId AND ei.isLocked = false")
    List<EntryImage> findUnlockedByOrganization(@Param("orgId") UUID organizationId);

    @Query("SELECT ei FROM EntryImage ei WHERE ei.imageKey IS NOT NULL AND ei.imageUrl NOT LIKE '%objectstorage%'")
    List<EntryImage> findByImageKeyNotNullAndImageUrlNotContainingObjectStorage();

    @Query("SELECT ei FROM EntryImage ei WHERE ei.imageKey LIKE CONCAT('%', :prefix, '%')")
    List<EntryImage> findByImageKeyContaining(@Param("prefix") String prefix);
}
