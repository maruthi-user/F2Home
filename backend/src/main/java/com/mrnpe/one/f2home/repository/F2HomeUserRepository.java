package com.mrnpe.one.f2home.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;

@Repository
public interface F2HomeUserRepository extends JpaRepository<F2HomeUser, Long> {

    Optional<F2HomeUser> findByPhoneNumber(String phoneNumber);

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