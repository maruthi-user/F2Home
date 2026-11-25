package com.mrnpe.one.f2home.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.f2home.exception.OtpVerificationException;
import com.mrnpe.one.f2home.exception.SmsUnavailableException;
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

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    static final Duration OTP_VALIDITY = Duration.ofMinutes(10);
    static final int MAX_ATTEMPTS = 5;

    private final OtpVerificationRepository otpRepository;
    private final Optional<SmsSender> smsSender;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpVerificationRepository otpRepository,
                      Optional<SmsSender> smsSender,
                      PasswordEncoder passwordEncoder) {
        this.otpRepository = otpRepository;
        this.smsSender = smsSender;
        this.passwordEncoder = passwordEncoder;
    }

    public void requireSmsAvailable() {
        if (smsSender.isEmpty()) throw new SmsUnavailableException(false);
    }

    @Transactional
    public void generateAndSendOtp(String phoneNumber, OtpPurpose purpose) {
        SmsSender sender = smsSender.orElseThrow(() -> new SmsUnavailableException(false));

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

        try {
            sender.sendSms(phoneNumber, "Your F2Home verification code is " + otp
                    + ". It is valid for 10 minutes. Do not share it with anyone.");
        } catch (RuntimeException e) {
            log.warn("OTP delivery failed for purpose {}", purpose);
            throw new SmsUnavailableException(true);
        }
    }

    /**
     * Verifies the OTP for the given phone + purpose. Marks it consumed on
     * success. Throws {@link OtpVerificationException} on expiry, exhaustion of
     * attempts, or a wrong code (each wrong entry counts as an attempt).
     */
    @Transactional(noRollbackFor = OtpVerificationException.class)
    public void verifyOtp(String phoneNumber, OtpPurpose purpose, String otp) {
        OtpVerification record = otpRepository
                .findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(phoneNumber, purpose)
                .orElseThrow(() -> new OtpVerificationException(
                        "No active OTP found for this phone number. Please request a new one."));

        if (record.getExpiresAt().isBefore(LocalDateTime.now())) {
            record.setConsumed(true);
            otpRepository.save(record);
            throw new OtpVerificationException("This OTP has expired. Please request a new one.");
        }

        if (record.getAttempts() >= MAX_ATTEMPTS) {
            record.setConsumed(true);
            otpRepository.save(record);
            throw new OtpVerificationException(
                    "Too many incorrect attempts. Please request a new OTP.");
        }

        record.setAttempts(record.getAttempts() + 1);

        if (!passwordEncoder.matches(otp, record.getOtpHash())) {
            otpRepository.save(record);
            int remaining = MAX_ATTEMPTS - record.getAttempts();
            if (remaining > 0) {
                throw new OtpVerificationException("Invalid OTP. " + remaining
                        + (remaining == 1 ? " attempt" : " attempts") + " remaining.");
            }
            record.setConsumed(true);
            otpRepository.save(record);
            throw new OtpVerificationException("Invalid OTP. Please request a new one.");
        }

        record.setConsumed(true);
        otpRepository.save(record);
    }
}