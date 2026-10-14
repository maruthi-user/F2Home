package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.entity.F2HomeRegistrationDraft;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.entity.RefreshToken;
import com.mrnpe.one.f2home.repository.F2HomeRegistrationDraftRepository;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.RefreshTokenRepository;
import com.mrnpe.one.f2home.security.F2HomeJwtService;

@ExtendWith(MockitoExtension.class)
class F2HomeAuthServiceTest {

    private static final String PHONE = "+919876543210";
    private static final byte[] JPEG_BYTES = jpegBytes();

    @Mock
    private F2HomeUserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private F2HomeRegistrationDraftRepository draftRepository;
    @Mock
    private OtpService otpService;
    @Mock
    private F2HomeRateLimiter rateLimiter;
    @Mock
    private F2HomeJwtService jwtService;
    @Mock
    private PasswordEncoder passwordEncoder;

    private F2HomeAuthService authService;

    @BeforeEach
    void setUp() {
        authService = new F2HomeAuthService(userRepository, refreshTokenRepository,
                draftRepository, otpService, rateLimiter, jwtService, passwordEncoder);
        lenient().when(userRepository.save(any(F2HomeUser.class)))
                .thenAnswer(inv -> {
                    F2HomeUser u = inv.getArgument(0);
                    if (u.getId() == null) u.setId(1L);
                    return u;
                });
        lenient().when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private static MultipartFile photo() {
        return new MockMultipartFile("photo", "selfie.jpg", "image/jpeg", JPEG_BYTES);
    }

    private static byte[] jpegBytes() {
        byte[] bytes = new byte[16];
        bytes[0] = (byte) 0xFF;
        bytes[1] = (byte) 0xD8;
        bytes[2] = (byte) 0xFF;
        bytes[3] = (byte) 0xE0;
        return bytes;
    }

    @Test
    void requestRegistrationOtpRejectsAdminSelfRegistration() {
        assertThatCode(() -> authService.requestRegistrationOtp(
                PHONE, "Admin Joe", "Rampur", F2HomeRole.ADMIN, photo(), "ip"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot self-register");
    }

    @Test
    void requestRegistrationOtpRejectsMissingPhoto() {
        assertThatCode(() -> authService.requestRegistrationOtp(
                PHONE, "Farmer Joe", "Rampur", F2HomeRole.FARMER, null, "ip"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("photo is required");
    }

    @Test
    void requestRegistrationOtpRejectsNonImageUpload() {
        MultipartFile text = new MockMultipartFile("photo", "note.txt", "text/plain", new byte[] {1, 2, 3});

        assertThatCode(() -> authService.requestRegistrationOtp(
                PHONE, "Farmer Joe", "Rampur", F2HomeRole.FARMER, text, "ip"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("JPEG, PNG or WEBP");
    }

    @Test
    void requestRegistrationOtpParksProfileAndPhotoInDraftThenSendsOtp() {
        when(userRepository.existsByPhoneNumber(PHONE)).thenReturn(false);

        authService.requestRegistrationOtp(
                PHONE, "  Farmer Joe ", " Rampur ", F2HomeRole.FARMER, photo(), "1.2.3.4");

        ArgumentCaptor<F2HomeRegistrationDraft> captor =
                ArgumentCaptor.forClass(F2HomeRegistrationDraft.class);
        verify(draftRepository).save(captor.capture());
        F2HomeRegistrationDraft draft = captor.getValue();
        assertThat(draft.getPhoneNumber()).isEqualTo(PHONE);
        assertThat(draft.getFullName()).isEqualTo("Farmer Joe");
        assertThat(draft.getVillage()).isEqualTo("Rampur");
        assertThat(draft.getRole()).isEqualTo(F2HomeRole.FARMER);
        assertThat(draft.getPhotoContentType()).isEqualTo("image/jpeg");
        assertThat(draft.getPhotoBytes()).isEqualTo(JPEG_BYTES);
        assertThat(draft.getPhotoSizeBytes()).isEqualTo(JPEG_BYTES.length);

        verify(otpService).generateAndSendOtp(PHONE, com.mrnpe.one.f2home.entity.OtpPurpose.REGISTRATION);
    }

    @Test
    void registerRejectsDuplicatePhoneNumber() {
        when(userRepository.existsByPhoneNumber(PHONE)).thenReturn(true);

        assertThatCode(() -> authService.register(PHONE, "123456", null, "Secret@123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void registerFailsWhenTheStepOneDraftIsMissing() {
        when(userRepository.existsByPhoneNumber(PHONE)).thenReturn(false);
        when(draftRepository.findByPhoneNumber(PHONE)).thenReturn(Optional.empty());

        assertThatCode(() -> authService.register(PHONE, "123456", null, "Secret@123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void registerVerifiesOtpCreatesActiveUserAndIssuesTokenPair() {
        when(userRepository.existsByPhoneNumber(PHONE)).thenReturn(false);
        when(draftRepository.findByPhoneNumber(PHONE)).thenReturn(Optional.of(draft()));
        when(passwordEncoder.encode("Secret@123")).thenReturn("bcrypt-hash");
        when(jwtService.generateToken(any(F2HomeUser.class))).thenReturn("access-token");
        when(jwtService.getExpirationTime()).thenReturn(900000L);

        AuthResponse response = authService.register(PHONE, "123456", "joe@example.com", "Secret@123");

        verify(otpService).verifyOtp(PHONE, com.mrnpe.one.f2home.entity.OtpPurpose.REGISTRATION, "123456");
        ArgumentCaptor<F2HomeUser> captor = ArgumentCaptor.forClass(F2HomeUser.class);
        verify(userRepository).save(captor.capture());
        F2HomeUser saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(F2HomeUserStatus.ACTIVE);
        assertThat(saved.isPhoneVerified()).isTrue();
        assertThat(saved.getRole()).isEqualTo(F2HomeRole.FARMER);
        assertThat(saved.getPasswordHash()).isEqualTo("bcrypt-hash");
        // Profile + self-taken photo came from the step-1 draft.
        assertThat(saved.getFullName()).isEqualTo("Farmer Joe");
        assertThat(saved.getVillage()).isEqualTo("Rampur");
        assertThat(saved.getPhotoContentType()).isEqualTo("image/jpeg");
        assertThat(saved.getPhotoBytes()).isEqualTo(JPEG_BYTES);

        verify(draftRepository).deleteByPhoneNumber(PHONE);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).hasSize(64);
        assertThat(response.user().role()).isEqualTo(F2HomeRole.FARMER);
        assertThat(response.user().village()).isEqualTo("Rampur");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    private F2HomeRegistrationDraft draft() {
        F2HomeRegistrationDraft draft = new F2HomeRegistrationDraft();
        draft.setPhoneNumber(PHONE);
        draft.setFullName("Farmer Joe");
        draft.setVillage("Rampur");
        draft.setRole(F2HomeRole.FARMER);
        draft.setPhotoContentType("image/jpeg");
        draft.setPhotoBytes(JPEG_BYTES);
        draft.setPhotoSizeBytes(JPEG_BYTES.length);
        return draft;
    }

    @Test
    void loginRejectsBadPassword() {
        when(rateLimiter.tryLoginAttempt(PHONE)).thenReturn(true);
        F2HomeUser user = activeUser();
        when(userRepository.findByPhoneNumber(PHONE)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "bcrypt-hash")).thenReturn(false);

        assertThatCode(() -> authService.login(PHONE, "wrong"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid phone number or password");
        verify(jwtService, never()).generateToken(any(F2HomeUser.class));
    }

    @Test
    void loginSucceedsAndUpdatesLastLogin() {
        when(rateLimiter.tryLoginAttempt(PHONE)).thenReturn(true);
        F2HomeUser user = activeUser();
        when(userRepository.findByPhoneNumber(PHONE)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secret@123", "bcrypt-hash")).thenReturn(true);
        when(jwtService.generateToken(any(F2HomeUser.class))).thenReturn("access-token");
        when(jwtService.getExpirationTime()).thenReturn(900000L);

        AuthResponse response = authService.login(PHONE, "Secret@123");

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(user.getLastLoginAt()).isNotNull();
    }

    @Test
    void loginAcceptsBareTenDigitIndianNumber() {
        // The UI shows a fixed +91 and the user types only the 10 digits; the
        // service must look the account up by its stored E.164 form.
        when(rateLimiter.tryLoginAttempt(PHONE)).thenReturn(true);
        F2HomeUser user = activeUser();
        when(userRepository.findByPhoneNumber(PHONE)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secret@123", "bcrypt-hash")).thenReturn(true);
        when(jwtService.generateToken(any(F2HomeUser.class))).thenReturn("access-token");
        when(jwtService.getExpirationTime()).thenReturn(900000L);

        AuthResponse response = authService.login("98765 43210", "Secret@123");

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().phoneNumber()).isEqualTo(PHONE);
        verify(userRepository, never()).findByPhoneNumber("98765 43210");
    }

    @Test
    void loginRejectsMalformedNumberBeforeTouchingTheDatabase() {
        assertThatCode(() -> authService.login("12345", "Secret@123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("valid mobile number");
        verify(userRepository, never()).findByPhoneNumber(any());
    }

    @Test
    void refreshRotatesTokens() {
        RefreshToken stored = new RefreshToken();
        stored.setUserId(1L);
        stored.setTokenHash("hash-of-raw");
        stored.setExpiresAt(LocalDateTime.now().plusDays(1));
        stored.setRevoked(false);
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));
        F2HomeUser user = activeUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(F2HomeUser.class))).thenReturn("new-access");
        when(jwtService.getExpirationTime()).thenReturn(900000L);

        AuthResponse response = authService.refresh("raw-token");

        assertThat(stored.isRevoked()).isTrue();
        assertThat(response.accessToken()).isEqualTo("new-access");
        assertThat(response.refreshToken()).hasSize(64);
        verify(refreshTokenRepository, org.mockito.Mockito.times(2))
                .save(any(RefreshToken.class));
    }

    @Test
    void refreshRejectsRevokedToken() {
        RefreshToken stored = new RefreshToken();
        stored.setUserId(1L);
        stored.setTokenHash("hash");
        stored.setExpiresAt(LocalDateTime.now().plusDays(1));
        stored.setRevoked(true);
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));

        assertThatCode(() -> authService.refresh("raw-token"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already refreshed or revoked");
    }

    @Test
    void resetPasswordVerifiesOtpAndRevokesAllRefreshTokens() {
        when(userRepository.findByPhoneNumber(PHONE)).thenReturn(Optional.of(activeUser()));
        when(passwordEncoder.encode("NewSecret@123")).thenReturn("new-hash");

        authService.resetPassword(PHONE, "654321", "NewSecret@123", "NewSecret@123");

        verify(otpService).verifyOtp(PHONE, com.mrnpe.one.f2home.entity.OtpPurpose.PASSWORD_RESET, "654321");
        verify(refreshTokenRepository).revokeAllByUserId(1L);
    }

    @Test
    void resetPasswordRejectsMismatchedConfirmation() {
        assertThatCode(() -> authService.resetPassword(PHONE, "654321", "NewSecret@123", "Other@123"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Passwords do not match");
        verify(otpService, never()).verifyOtp(anyString(), any(), anyString());
    }

    private F2HomeUser activeUser() {
        F2HomeUser user = new F2HomeUser();
        user.setId(1L);
        user.setPhoneNumber(PHONE);
        user.setFullName("Test User");
        user.setRole(F2HomeRole.CUSTOMER);
        user.setStatus(F2HomeUserStatus.ACTIVE);
        user.setPhoneVerified(true);
        user.setPasswordHash("bcrypt-hash");
        return user;
    }
}