package com.mrnpe.one.f2home.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.dto.UserResponse;
import com.mrnpe.one.f2home.entity.F2HomeRegistrationDraft;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.entity.OtpPurpose;
import com.mrnpe.one.f2home.entity.RefreshToken;
import com.mrnpe.one.f2home.repository.F2HomeRegistrationDraftRepository;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.RefreshTokenRepository;
import com.mrnpe.one.f2home.security.F2HomeJwtService;

/**
 * F2HOME registration / login / refresh / logout / password-reset flows.
 * Completely isolated from the (removed) legacy IAMUser stack.
 *
 * Registration is two-step: step 1 parks the profile (name, village, role,
 * self-taken photo) in a draft keyed by phone number and sends the OTP;
 * step 2 verifies the OTP and only then creates the account row.
 */
@Service
public class F2HomeAuthService {

    private static final Duration REFRESH_TOKEN_VALIDITY = Duration.ofDays(30);
    private static final int REFRESH_TOKEN_BYTES = 32;

    /** Photo ceiling for the registration selfie. */
    static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    /** Unverified drafts (and the photo inside them) are dropped after this. */
    static final Duration DRAFT_TTL = Duration.ofHours(24);
    private static final Set<String> PHOTO_CONTENT_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");

    private final F2HomeUserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final F2HomeRegistrationDraftRepository draftRepository;
    private final OtpService otpService;
    private final F2HomeRateLimiter rateLimiter;
    private final F2HomeJwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public F2HomeAuthService(F2HomeUserRepository userRepository,
                             RefreshTokenRepository refreshTokenRepository,
                             F2HomeRegistrationDraftRepository draftRepository,
                             OtpService otpService,
                             F2HomeRateLimiter rateLimiter,
                             F2HomeJwtService jwtService,
                             PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.draftRepository = draftRepository;
        this.otpService = otpService;
        this.rateLimiter = rateLimiter;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= REGISTRATION: STEP 1 — REQUEST OTP =================

    @Transactional
    public void requestRegistrationOtp(String rawPhoneNumber, String fullName, String village,
                                       F2HomeRole role, MultipartFile photo, String clientIp) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        if (role == F2HomeRole.ADMIN) {
            throw new BadRequestException("Admin accounts cannot self-register.");
        }
        if (role != F2HomeRole.CUSTOMER && role != F2HomeRole.FARMER) {
            throw new BadRequestException("Choose either a Farmer or a Customer account.");
        }
        if (fullName == null || fullName.isBlank()) {
            throw new BadRequestException("Full name is required.");
        }
        if (village == null || village.isBlank()) {
            throw new BadRequestException("Village is required.");
        }
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new IllegalStateException(
                    "An account already exists for this phone number. Please log in instead.");
        }

        PhotoUpload selfie = readRegistrationPhoto(photo);

        rateLimiter.assertOtpRequestAllowed(phoneNumber, clientIp);

        // Housekeeping first: drop never-verified drafts from previous attempts.
        draftRepository.deleteByCreatedAtBefore(LocalDateTime.now().minus(DRAFT_TTL));

        F2HomeRegistrationDraft draft = new F2HomeRegistrationDraft();
        draft.setPhoneNumber(phoneNumber);
        draft.setFullName(fullName.trim());
        draft.setVillage(village.trim());
        draft.setRole(role);
        draft.setPhotoContentType(selfie.contentType());
        draft.setPhotoBytes(selfie.bytes());
        draft.setPhotoSizeBytes(selfie.bytes().length);
        draftRepository.save(draft);

        otpService.generateAndSendOtp(phoneNumber, OtpPurpose.REGISTRATION);
    }

    // ================= REGISTRATION: STEP 2 — VERIFY + CREATE =================

    @Transactional
    public AuthResponse register(String rawPhoneNumber, String otp, String email, String password) {
        String phoneNumber = PhoneNumbers.normalize(rawPhoneNumber);
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new IllegalStateException(
                    "An account already exists for this phone number. Please log in instead.");
        }

        // The profile + photo live in the draft written by step 1; without it
        // the OTP alone is not enough to create an account.
        F2HomeRegistrationDraft draft = draftRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new BadRequestException(
                        "Your registration details expired. Please start again with your phone number, name, village, role and photo."));
        if (draft.getRole() != F2HomeRole.CUSTOMER && draft.getRole() != F2HomeRole.FARMER) {
            throw new BadRequestException("Choose either a Farmer or a Customer account.");
        }

        otpService.verifyOtp(phoneNumber, OtpPurpose.REGISTRATION, otp);

        F2HomeUser user = new F2HomeUser();
        user.setPhoneNumber(phoneNumber);
        user.setEmail((email == null || email.isBlank()) ? null : email.trim());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(draft.getFullName());
        user.setVillage(draft.getVillage());
        user.setRole(draft.getRole());
        user.setPhotoContentType(draft.getPhotoContentType());
        user.setPhotoBytes(draft.getPhotoBytes());
        user.setPhotoSizeBytes(draft.getPhotoSizeBytes());
        // Farmers wait for an admin to approve them (hidden from the
        // marketplace until then - see ProductService); customers are live
        // immediately since there is nothing to review.
        user.setStatus(draft.getRole() == F2HomeRole.FARMER
                ? F2HomeUserStatus.PENDING_APPROVAL
                : F2HomeUserStatus.ACTIVE);
        user.setPhoneVerified(true);
        user = userRepository.save(user);

        draftRepository.deleteByPhoneNumber(phoneNumber);

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

        // PENDING_APPROVAL farmers can still log in (and list produce) while
        // they wait - only a rejected/suspended (INACTIVE) account is blocked.
        if (user.getStatus() == F2HomeUserStatus.INACTIVE) {
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

    private record PhotoUpload(String contentType, byte[] bytes) {}

    /**
     * Validates the self-taken photo: required, JPEG/PNG/WEBP, within the
     * size ceiling, and the bytes must really be an image (the content type
     * arrives from the client, so it is only trusted after the header check).
     */
    private PhotoUpload readRegistrationPhoto(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new BadRequestException(
                    "A photo is required. Take one with your camera or upload an image.");
        }
        if (photo.getSize() > MAX_PHOTO_BYTES) {
            throw new BadRequestException("Photo is over the 5MB limit. Please use a smaller photo.");
        }

        String contentType = photo.getContentType() == null
                ? ""
                : photo.getContentType().toLowerCase(Locale.ROOT).trim();
        if (!PHOTO_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Photo must be a JPEG, PNG or WEBP image.");
        }

        byte[] bytes;
        try {
            bytes = photo.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Photo could not be read. Please try again.");
        }
        if (!looksLikeImage(bytes)) {
            throw new BadRequestException("Photo must be a JPEG, PNG or WEBP image.");
        }

        // "image/jpg" is common but not a real media type; normalise it.
        String storedType = contentType.equals("image/jpg") ? "image/jpeg" : contentType;
        return new PhotoUpload(storedType, bytes);
    }

    private boolean looksLikeImage(byte[] bytes) {
        if (bytes.length < 12) return false;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return true;
        }
        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return true;
        }
        // WEBP: "RIFF" .... "WEBP"
        return ascii(bytes, 0, 4).equals("RIFF") && ascii(bytes, 8, 4).equals("WEBP");
    }

    private String ascii(byte[] bytes, int offset, int length) {
        return new String(bytes, offset, length, StandardCharsets.US_ASCII);
    }

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