package com.mrnpe.one.f2home.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.ProductMedia;
import com.mrnpe.one.f2home.entity.ProductMediaType;

@Repository
public interface ProductMediaRepository extends JpaRepository<ProductMedia, UUID> {

    /**
     * Everything about a media row except its bytes. Product listings and
     * detail responses use this so the (possibly 25MB) video column is only
     * ever read by the streaming endpoint.
     */
    interface ProductMediaMeta {
        UUID getId();
        Long getProductId();
        ProductMediaType getMediaType();
        String getContentType();
        String getFileName();
        long getSizeBytes();
        int getSortOrder();
    }

    List<ProductMediaMeta> findByProductIdOrderBySortOrderAsc(Long productId);

    List<ProductMediaMeta> findByProductIdInOrderBySortOrderAsc(Collection<Long> productIds);

    Optional<ProductMedia> findByIdAndProductId(UUID id, Long productId);

    @Modifying
    @Query("delete from ProductMedia m where m.productId = :productId and m.id not in :keepIds")
    void deleteByProductIdAndIdNotIn(@Param("productId") Long productId,
                                     @Param("keepIds") Collection<UUID> keepIds);

    @Modifying
    @Query("delete from ProductMedia m where m.productId = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}
