package com.mrnpe.one.f2home.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductStatus;

import jakarta.persistence.LockModeType;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByIdAndStatus(Long id, ProductStatus status);

    List<Product> findByFarmerIdAndStatusOrderByCreatedAtDesc(Long farmerId, ProductStatus status);

    List<Product> findByStatusOrderByCreatedAtDesc(ProductStatus status);

    List<Product> findByStatusAndCategoryOrderByCreatedAtDesc(ProductStatus status, String category);

    List<Product> findByIdInAndStatus(Collection<Long> ids, ProductStatus status);

    /**
     * Bounding-box pre-filter for "within N km": cheap in SQL, then the
     * service applies the exact great-circle distance. Category is optional.
     */
    @Query("""
            select p from Product p
            where p.status = com.mrnpe.one.f2home.entity.ProductStatus.ACTIVE
              and p.lat between :minLat and :maxLat
              and p.lng between :minLng and :maxLng
              and (:category is null or p.category = :category)
            """)
    List<Product> findActiveInBox(@Param("minLat") double minLat,
                                  @Param("maxLat") double maxLat,
                                  @Param("minLng") double minLng,
                                  @Param("maxLng") double maxLng,
                                  @Param("category") String category);

    /**
     * Row-locked read used by checkout so two customers cannot both buy the
     * last units: the second transaction waits, then sees the reduced stock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
