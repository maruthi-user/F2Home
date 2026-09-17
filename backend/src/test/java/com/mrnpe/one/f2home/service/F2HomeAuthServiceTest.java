package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.entity.RefreshToken;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.RefreshTokenRepository;
import com.mrnpe.one.f2home.security.F2HomeJwtService;

@ExtendWith(MockitoExtension.class)
class F2HomeAuthServiceTest {

    private static final String PHONE = "+919876543210";

    @Mock
    private F2HomeUserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
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
                otpService, rateLimiter, jwtService, passwordEncoder);
        lenient().when(userRepository.save(any(F2HomeUser.class)))
                .thenAnswer(inv -> {
                    F2HomeUser u = inv.getArgument(0);
                    if (u.getId() == null) u.setId(1L);
                    return u;
                });
        lenient().when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void registerRejectsAdminSelfRegistration() {
        assertThatCode(() -> authService.requestRegistrationOtp(PHONE, F2HomeRole.ADMIN, "ip"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cannot self-register");
    }

    @Test
    void registerRejectsDuplicatePhoneNumber() {
        when(userRepository.existsByPhoneNumber(PHONE)).thenReturn(true);

        assertThatCode(() -> authService.register(PHONE, "123456", "Farmer Joe",
                null, "Secret@123", F2HomeRole.FARMER))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void registerVerifiesOtpCreatesActiveUserAndIssuesTokenPair() {
        when(userRepository.existsByPhoneNumber(PHONE)).thenReturn(false);
        when(passwordEncoder.encode("Secret@123")).thenReturn("bcrypt-hash");
        when(jwtService.generateToken(any(F2HomeUser.class))).thenReturn("access-token");
        when(jwtService.getExpirationTime()).thenReturn(900000L);

        AuthResponse response = authService.register(PHONE, "123456", "Farmer Joe",
                "joe@example.com", "Secret@123", F2HomeRole.FARMER);

        verify(otpService).verifyOtp(PHONE, com.mrnpe.one.f2home.entity.OtpPurpose.REGISTRATION, "123456");
        ArgumentCaptor<F2HomeUser> captor = ArgumentCaptor.forClass(F2HomeUser.class);
        verify(userRepository).save(captor.capture());
        F2HomeUser saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(F2HomeUserStatus.ACTIVE);
        assertThat(saved.isPhoneVerified()).isTrue();
        assertThat(saved.getRole()).isEqualTo(F2HomeRole.FARMER);
        assertThat(saved.getPasswordHash()).isEqualTo("bcrypt-hash");

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).hasSize(64);
        assertThat(response.user().role()).isEqualTo(F2HomeRole.FARMER);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
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