package com.mrnpe.one.f2home.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.entity.OtpPurpose;
import com.mrnpe.one.f2home.entity.OtpVerification;
import com.mrnpe.one.f2home.repository.OtpVerificationRepository;

/**
 * Generates, hashes, sends and verifies 6-digit SMS OTPs.
 *
 * Rules: 10-minute validity, max 5 wrong entries per OTP, requesting a new
 * OTP invalidates the previous one. Only the BCrypt hash of the OTP is
 * persisted.
 */
@Service
public class OtpService {

    static final Duration OTP_VALIDITY = Duration.ofMinutes(10);
    static final int MAX_ATTEMPTS = 5;

    private final OtpVerificationRepository otpRepository;
    private final SmsSender smsSender;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpVerificationRepository otpRepository,
                      SmsSender smsSender,
                      PasswordEncoder passwordEncoder) {
        this.otpRepository = otpRepository;
        this.smsSender = smsSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void generateAndSendOtp(String phoneNumber, OtpPurpose purpose) {
        // Invalidate any previous outstanding OTP for this phone + purpose.
        otpRepository.findByPhoneNumberAndPurposeAndConsumedFalse(phoneNumber, purpose)
                .ifPresent(existing -> {
                    existing.setConsumed(true);
                    otpRepository.save(existing);
                });

        String otp = String.format("%06d", random.nextInt(1_000_000));

        OtpVerification record = new OtpVerification();
        record.setPhoneNumber(phoneNumber);
        record.setPurpose(purpose);
        record.setOtpHash(passwordEncoder.encode(otp));
        record.setExpiresAt(LocalDateTime.now().plus(OTP_VALIDITY));
        record.setAttempts(0);
        record.setConsumed(false);
        otpRepository.save(record);

        smsSender.sendSms(phoneNumber,
                "Your F2Home verification code is " + otp
                        + ". It is valid for 10 minutes. Do not share it with anyone.");
    }

    /**
     * Verifies the OTP for the given phone + purpose. Marks it consumed on
     * success. Throws {@link BadRequestException} on expiry, exhaustion of
     * attempts, or a wrong code (each wrong entry counts as an attempt).
     */
    @Transactional
    public void verifyOtp(String phoneNumber, OtpPurpose purpose, String otp) {
        OtpVerification record = otpRepository
                .findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(phoneNumber, purpose)
                .orElseThrow(() -> new BadRequestException(
                        "No active OTP found for this phone number. Please request a new one."));

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            record.setConsumed(true);
            otpRepository.save(record);
            throw new BadRequestException("This OTP has expired. Please request a new one.");
        }

        if (record.getAttempts() >= MAX_ATTEMPTS) {
            record.setConsumed(true);
            otpRepository.save(record);
            throw new BadRequestException(
                    "Too many incorrect attempts. Please request a new OTP.");
        }

        record.setAttempts(record.getAttempts() + 1);

        if (!passwordEncoder.matches(otp, record.getOtpHash())) {
            otpRepository.save(record);
            int remaining = MAX_ATTEMPTS - record.getAttempts();
            if (remaining > 0) {
                throw new BadRequestException("Invalid OTP. " + remaining
                        + (remaining == 1 ? " attempt" : " attempts") + " remaining.");
            }
            record.setConsumed(true);
            otpRepository.save(record);
            throw new BadRequestException("Invalid OTP. Please request a new one.");
        }

        record.setConsumed(true);
        otpRepository.save(record);
    }
}