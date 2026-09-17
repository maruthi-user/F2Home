package com.mrnpe.one.f2home.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.mrnpe.one.exception.GlobalExceptionHandler;
import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.dto.UserResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.exception.RateLimitException;
import com.mrnpe.one.f2home.service.F2HomeAuthService;

/**
 * Mirrors the (removed) AuthControllerV2Test MockMvc pattern: standalone
 * setup with the shared GlobalExceptionHandler registered, covering all 7
 * F2HOME auth endpoints.
 */
@ExtendWith(MockitoExtension.class)
class F2HomeAuthControllerTest {

    @Mock
    private F2HomeAuthService authService;

    @InjectMocks
    private F2HomeAuthController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void requestRegistrationOtpReturnsMessage() throws Exception {
        mockMvc.perform(post("/api/f2home/auth/register/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","role":"FARMER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(authService).requestRegistrationOtp(eq("+919876543210"),
                eq(F2HomeRole.FARMER), anyString());
    }

    @Test
    void requestRegistrationOtpAcceptsCaseInsensitiveRole() throws Exception {
        // Swagger/manual clients may type "Farmer"; the enum factory
        // normalizes it to FARMER instead of failing deserialization.
        mockMvc.perform(post("/api/f2home/auth/register/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","role":"Farmer"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(authService).requestRegistrationOtp(eq("+919876543210"),
                eq(F2HomeRole.FARMER), anyString());
    }

    @Test
    void requestRegistrationOtpRejectsUnknownRoleWithHelpfulMessage() throws Exception {
        mockMvc.perform(post("/api/f2home/auth/register/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","role":"NotARole"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Invalid role 'NotARole'. Valid roles: CUSTOMER, FARMER, DELIVERY_PARTNER, ADMIN"));
    }

    @Test
    void requestRegistrationOtpIsRateLimited() throws Exception {
        doThrow(new RateLimitException("Too many OTP requests."))
                .when(authService).requestRegistrationOtp(anyString(), any(), anyString());

        mockMvc.perform(post("/api/f2home/auth/register/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","role":"FARMER"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many OTP requests."));
    }

    @Test
    void registerVerifyOtpReturnsAuthResponse() throws Exception {
        when(authService.register(anyString(), anyString(), anyString(), any(), anyString(), any()))
                .thenReturn(new AuthResponse("access", 900000L, "refresh",
                        new UserResponse(1L, "+919876543210", null, "Farmer Joe",
                                F2HomeRole.FARMER, F2HomeUserStatus.ACTIVE, true)));

        mockMvc.perform(post("/api/f2home/auth/register/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","otp":"123456","fullName":"Farmer Joe",
                                 "email":"joe@example.com","password":"Secret@123","role":"FARMER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"))
                .andExpect(jsonPath("$.refreshToken").value("refresh"))
                .andExpect(jsonPath("$.user.role").value("FARMER"));
    }

    @Test
    void loginReturnsAuthResponse() throws Exception {
        when(authService.login(anyString(), anyString()))
                .thenReturn(new AuthResponse("access", 900000L, "refresh",
                        new UserResponse(1L, "+919876543210", null, "Customer",
                                F2HomeRole.CUSTOMER, F2HomeUserStatus.ACTIVE, true)));

        mockMvc.perform(post("/api/f2home/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","password":"Secret@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access"));
    }

    @Test
    void loginRejectsMalformedPhoneNumber() throws Exception {
        mockMvc.perform(post("/api/f2home/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"98765","password":"Secret@123"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void refreshReturnsRotatedPair() throws Exception {
        when(authService.refresh(anyString()))
                .thenReturn(new AuthResponse("new-access", 900000L, "new-refresh",
                        new UserResponse(1L, "+919876543210", null, "Customer",
                                F2HomeRole.CUSTOMER, F2HomeUserStatus.ACTIVE, true)));

        mockMvc.perform(post("/api/f2home/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"raw-token"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh"));
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        mockMvc.perform(post("/api/f2home/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"raw-token"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logged out successfully."));

        verify(authService).logout("raw-token");
    }

    @Test
    void forgotPasswordAlwaysReturnsOk() throws Exception {
        mockMvc.perform(post("/api/f2home/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210"}
                                """))
                .andExpect(status().isOk());

        verify(authService).forgotPassword("+919876543210");
    }

    @Test
    void resetPasswordReturnsMessage() throws Exception {
        mockMvc.perform(post("/api/f2home/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"+919876543210","otp":"654321",
                                 "newPassword":"NewSecret@123","confirmPassword":"NewSecret@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(
                        "Password reset successfully. Please log in with your new password."));
    }
}