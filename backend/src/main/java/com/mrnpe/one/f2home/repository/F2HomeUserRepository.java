package com.mrnpe.one.f2home.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;

@Repository
public interface F2HomeUserRepository extends JpaRepository<F2HomeUser, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from F2HomeUser u where u.id = :id")
    Optional<F2HomeUser> lockForCheckout(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<F2HomeUser> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<F2HomeUser> findOneByPhoneNumber(String phoneNumber);

    @Query("select u.sessionVersion from F2HomeUser u where u.id = :id and u.status <> com.mrnpe.one.f2home.entity.F2HomeUserStatus.INACTIVE")
    Optional<Long> findActiveSessionVersion(@Param("id") Long id);

    Optional<F2HomeUser> findByPhoneNumber(String phoneNumber);

    @Query("""
            select u from F2HomeUser u where u.testAccount = true
              and (:role is null or u.role = :role)
              and (:status is null or u.status = :status)
              and (locate(:query, lower(u.fullName)) > 0 or locate(:query, lower(u.username)) > 0
                   or locate(:query, u.phoneNumber) > 0)
            order by u.id desc
            """)
    Slice<F2HomeUser> searchTestAccounts(@Param("query") String query, @Param("role") F2HomeRole role,
            @Param("status") F2HomeUserStatus status, Pageable pageable);

    boolean existsByPhoneNumber(String phoneNumber);

    List<F2HomeUser> findByRoleAndStatusOrderByCreatedAtAsc(
            com.mrnpe.one.f2home.entity.F2HomeRole role, F2HomeUserStatus status);

    /** Farmers whose listings are allowed to appear in the marketplace. */
    @Query("""
            select u.id from F2HomeUser u
            where u.role = com.mrnpe.one.f2home.entity.F2HomeRole.FARMER
              and u.status = com.mrnpe.one.f2home.entity.F2HomeUserStatus.ACTIVE
            """)
    Set<Long> findActiveFarmerIds();

    interface DeliveryFarm {
        Long getId();
        Double getLat();
        Double getLng();
        Double getRadius();
        String getDays();
    }

    @Query("""
            select u.id as id, u.farmLat as lat, u.farmLng as lng,
                u.deliveryRadiusKm as radius, u.deliveryDays as days
            from F2HomeUser u
            where u.role = com.mrnpe.one.f2home.entity.F2HomeRole.FARMER
              and u.status = com.mrnpe.one.f2home.entity.F2HomeUserStatus.ACTIVE
              and u.farmLat is not null and u.farmLng is not null and u.deliveryDays is not null
            """)
    List<DeliveryFarm> findDeliveryFarms();

    interface FarmerRadiusRow {
        Long getId();
        Double getDeliveryRadiusKm();
    }

    /** Each approved farmer's own delivery radius (null = not set yet, caller applies the default). */
    @Query("""
            select u.id as id, u.deliveryRadiusKm as deliveryRadiusKm from F2HomeUser u
            where u.role = com.mrnpe.one.f2home.entity.F2HomeRole.FARMER
              and u.status = com.mrnpe.one.f2home.entity.F2HomeUserStatus.ACTIVE
            """)
    List<FarmerRadiusRow> findActiveFarmerRadii();
}