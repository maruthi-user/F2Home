package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
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
import com.mrnpe.one.f2home.entity.OtpPurpose;
import com.mrnpe.one.f2home.entity.OtpVerification;
import com.mrnpe.one.f2home.repository.OtpVerificationRepository;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    private static final String PHONE = "+919876543210";

    @Mock
    private OtpVerificationRepository otpRepository;
    @Mock
    private SmsSender smsSender;
    @Mock
    private PasswordEncoder passwordEncoder;

    private OtpService otpService;

    @BeforeEach
    void setUp() {
        otpService = new OtpService(otpRepository, smsSender, passwordEncoder);
        lenient().when(otpRepository.save(any(OtpVerification.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void generateAndSendOtpHashesOtpAndSendsSms() {
        when(passwordEncoder.encode(anyString())).thenReturn("$bcrypt-hash$");

        otpService.generateAndSendOtp(PHONE, OtpPurpose.REGISTRATION);

        ArgumentCaptor<OtpVerification> captor = ArgumentCaptor.forClass(OtpVerification.class);
        verify(otpRepository).save(captor.capture());
        OtpVerification saved = captor.getValue();
        assertThat(saved.getPhoneNumber()).isEqualTo(PHONE);
        assertThat(saved.getPurpose()).isEqualTo(OtpPurpose.REGISTRATION);
        assertThat(saved.getOtpHash()).isEqualTo("$bcrypt-hash$");
        assertThat(saved.isConsumed()).isFalse();
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusMinutes(9));
        verify(smsSender).sendSms(eq(PHONE), anyString());
    }

    @Test
    void generateAndSendOtpInvalidatesPreviousOutstandingOtp() {
        OtpVerification previous = new OtpVerification();
        previous.setPhoneNumber(PHONE);
        previous.setPurpose(OtpPurpose.REGISTRATION);
        previous.setConsumed(false);
        when(otpRepository.findByPhoneNumberAndPurposeAndConsumedFalse(PHONE, OtpPurpose.REGISTRATION))
                .thenReturn(Optional.of(previous));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");

        otpService.generateAndSendOtp(PHONE, OtpPurpose.REGISTRATION);

        assertThat(previous.isConsumed()).isTrue();
        verify(otpRepository, atLeastOnce()).save(previous);
    }

    @Test
    void verifyOtpFailsWhenNoActiveOtpExists() {
        when(otpRepository.findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(PHONE, OtpPurpose.REGISTRATION))
                .thenReturn(Optional.empty());

        assertThatCode(() -> otpService.verifyOtp(PHONE, OtpPurpose.REGISTRATION, "123456"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("No active OTP");
    }

    @Test
    void verifyOtpFailsWhenExpired() {
        OtpVerification expired = otp(OtpPurpose.REGISTRATION);
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(otpRepository.findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(PHONE, OtpPurpose.REGISTRATION))
                .thenReturn(Optional.of(expired));

        assertThatCode(() -> otpService.verifyOtp(PHONE, OtpPurpose.REGISTRATION, "123456"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("expired");
        assertThat(expired.isConsumed()).isTrue();
    }

    @Test
    void verifyOtpRejectsWrongCodeAndCountsAttempts() {
        OtpVerification record = otp(OtpPurpose.REGISTRATION);
        when(otpRepository.findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(PHONE, OtpPurpose.REGISTRATION))
                .thenReturn(Optional.of(record));
        when(passwordEncoder.matches(eq("000000"), anyString())).thenReturn(false);
        when(passwordEncoder.matches(eq("123456"), anyString())).thenReturn(true);

        assertThatCode(() -> otpService.verifyOtp(PHONE, OtpPurpose.REGISTRATION, "000000"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid OTP");
        assertThat(record.getAttempts()).isEqualTo(1);
        assertThat(record.isConsumed()).isFalse();

        // Correct code succeeds afterwards.
        assertThatCode(() -> otpService.verifyOtp(PHONE, OtpPurpose.REGISTRATION, "123456"))
                .doesNotThrowAnyException();
        assertThat(record.isConsumed()).isTrue();
    }

    @Test
    void verifyOtpLocksOutAfterMaxAttempts() {
        OtpVerification record = otp(OtpPurpose.REGISTRATION);
        record.setAttempts(OtpService.MAX_ATTEMPTS);
        when(otpRepository.findTopByPhoneNumberAndPurposeAndConsumedFalseOrderByCreatedAtDesc(PHONE, OtpPurpose.REGISTRATION))
                .thenReturn(Optional.of(record));

        assertThatCode(() -> otpService.verifyOtp(PHONE, OtpPurpose.REGISTRATION, "123456"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Too many incorrect attempts");
        assertThat(record.isConsumed()).isTrue();
        verify(smsSender, never()).sendSms(anyString(), anyString());
    }

    private OtpVerification otp(OtpPurpose purpose) {
        OtpVerification record = new OtpVerification();
        record.setPhoneNumber(PHONE);
        record.setPurpose(purpose);
        record.setOtpHash("hash");
        record.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        record.setAttempts(0);
        record.setConsumed(false);
        return record;
    }
}