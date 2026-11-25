package com.mrnpe.one.f2home.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.OtpPurpose;
import com.mrnpe.one.f2home.entity.OtpVerification;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OtpVerification> findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(
            String phoneNumber, OtpPurpose purpose);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OtpVerification> findByPhoneNumberAndPurposeAndConsumedFalse(
            String phoneNumber, OtpPurpose purpose);
}