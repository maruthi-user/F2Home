package com.mrnpe.one.f2home.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.dto.UserResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.entity.OtpPurpose;
import com.mrnpe.one.f2home.entity.RefreshToken;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.RefreshTokenRepository;
import com.mrnpe.one.f2home.security.F2HomeJwtService;

/**
 * F2HOME registration / login / refresh / logout / password-reset flows.
 * Completely isolated from the (removed) legacy IAMUser stack.
 */
@Service
public class F2HomeAuthService {

    private static final Duration REFRESH_TOKEN_VALIDITY = Duration.ofDays(30);
    private static final int REFRESH_TOKEN_BYTES = 32;

    private final F2HomeUserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpService otpService;
    private final F2HomeRateLimiter rateLimiter;
    private final F2HomeJwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public F2HomeAuthService(F2HomeUserRepository userRepository,
                             RefreshTokenRepository refreshTokenRepository,
                             OtpService otpService,
                             F2HomeRateLimiter rateLimiter,
                             F2HomeJwtService jwtService,
                             PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.otpService = otpService;
        this.rateLimiter = rateLimiter;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= REGISTRATION: STEP 1 — REQUEST OTP =================

    @Transactional
    public void requestRegistrationOtp(String rawPhoneNumber, F2HomeRole role, String clientIp) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        if (role == F2HomeRole.ADMIN) {
            throw new BadRequestException("Admin accounts cannot self-register.");
        }
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new IllegalStateException(
                    "An account already exists for this phone number. Please log in instead.");
        }
        rateLimiter.assertOtpRequestAllowed(phoneNumber, clientIp);
        otpService.generateAndSendOtp(phoneNumber, OtpPurpose.REGISTRATION);
    }

    // ================= REGISTRATION: STEP 2 — VERIFY + CREATE =================

    @Transactional
    public AuthResponse register(String rawPhoneNumber, String otp, String fullName,
                                 String email, String password, F2HomeRole role) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        if (role == F2HomeRole.ADMIN) {
            throw new BadRequestException("Admin accounts cannot self-register.");
        }
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new IllegalStateException(
                    "An account already exists for this phone number. Please log in instead.");
        }

        otpService.verifyOtp(phoneNumber, OtpPurpose.REGISTRATION, otp);

        F2HomeUser user = new F2HomeUser();
        user.setPhoneNumber(phoneNumber);
        user.setEmail((email == null || email.isBlank()) ? null : email.trim());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName.trim());
        user.setRole(role);
        user.setStatus(F2HomeUserStatus.ACTIVE);
        user.setPhoneVerified(true);
        user = userRepository.save(user);

        return issueTokenPair(user);
    }

    // ================= LOGIN (PHONE + PASSWORD) =================

    @Transactional
    public AuthResponse login(String rawPhoneNumber, String password) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        if (!rateLimiter.tryLoginAttempt(phoneNumber)) {
            throw new com.mrnpe.one.f2home.exception.RateLimitException(
                    "Too many login attempts. Please try again in 15 minutes.");
        }

        F2HomeUser user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new BadRequestException("Invalid phone number or password."));

        if (user.getStatus() != F2HomeUserStatus.ACTIVE) {
            throw new IllegalStateException(
                    "This account is inactive. Please contact F2Home support.");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadRequestException("Invalid phone number or password.");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return issueTokenPair(user);
    }

    // ================= REFRESH (WITH ROTATION) =================

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(sha256Hex(rawRefreshToken))
                .orElseThrow(() -> new BadRequestException(
                        "Invalid refresh token. Please log in again."));

        if (stored.isRevoked()) {
            throw new BadRequestException(
                    "This session was already refreshed or revoked. Please log in again.");
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            stored.setRevoked(true);
            refreshTokenRepository.save(stored);
            throw new BadRequestException(
                    "Your session has expired. Please log in again.");
        }

        // Rotate: revoke the presented token, issue a fresh pair.
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        F2HomeUser user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BadRequestException(
                        "Account no longer exists. Please log in again."));

        return issueTokenPair(user);
    }

    // ================= LOGOUT =================

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(sha256Hex(rawRefreshToken))
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    // ================= FORGOT PASSWORD =================

    @Transactional
    public void forgotPassword(String rawPhoneNumber) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        boolean exists = userRepository.existsByPhoneNumber(phoneNumber);
        if (!exists) {
            // Deliberately silent: don't reveal whether the number is registered.
            return;
        }
        rateLimiter.assertOtpRequestAllowed(phoneNumber, "password-reset");
        otpService.generateAndSendOtp(phoneNumber, OtpPurpose.PASSWORD_RESET);
    }

    // ================= RESET PASSWORD =================

    @Transactional
    public void resetPassword(String rawPhoneNumber, String otp, String newPassword, String confirmPassword) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestException("Passwords do not match.");
        }

        F2HomeUser user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new BadRequestException(
                        "No account found for this phone number."));

        otpService.verifyOtp(phoneNumber, OtpPurpose.PASSWORD_RESET, otp);

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Password changed: every outstanding session (refresh token) dies now.
        refreshTokenRepository.revokeAllByUserId(user.getId());
    }

    // ================= HELPERS =================

    private AuthResponse issueTokenPair(F2HomeUser user) {
        String accessToken = jwtService.generateToken(user);

        byte[] raw = new byte[REFRESH_TOKEN_BYTES];
        random.nextBytes(raw);
        String rawRefreshToken = HexFormat.of().formatHex(raw);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setTokenHash(sha256Hex(rawRefreshToken));
        refreshToken.setExpiresAt(LocalDateTime.now().plus(REFRESH_TOKEN_VALIDITY));
        refreshToken.setRevoked(false);
        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(
                accessToken,
                jwtService.getExpirationTime(),
                rawRefreshToken,
                UserResponse.from(user));
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}