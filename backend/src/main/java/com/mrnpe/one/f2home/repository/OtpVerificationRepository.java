package com.mrnpe.one.f2home.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.OtpPurpose;
import com.mrnpe.one.f2home.entity.OtpVerification;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(
            String phoneNumber, OtpPurpose purpose);

    Optional<OtpVerification> findByPhoneNumberAndPurposeAndConsumedFalse(
            String phoneNumber, OtpPurpose purpose);
}