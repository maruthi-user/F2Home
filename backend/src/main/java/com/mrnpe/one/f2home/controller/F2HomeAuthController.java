package com.mrnpe.one.f2home.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.dto.ForgotPasswordRequest;
import com.mrnpe.one.f2home.dto.LoginRequest;
import com.mrnpe.one.f2home.dto.LogoutRequest;
import com.mrnpe.one.f2home.dto.MessageResponse;
import com.mrnpe.one.f2home.dto.RefreshTokenRequest;
import com.mrnpe.one.f2home.dto.RegisterOtpRequest;
import com.mrnpe.one.f2home.dto.RegisterVerifyRequest;
import com.mrnpe.one.f2home.dto.ResetPasswordRequest;
import com.mrnpe.one.f2home.service.F2HomeAuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/f2home/auth")
public class F2HomeAuthController {

    private final F2HomeAuthService authService;

    public F2HomeAuthController(F2HomeAuthService authService) {
        this.authService = authService;
    }

    // ================= REGISTRATION: STEP 1 — REQUEST OTP =================
    @PostMapping("/register/request-otp")
    public ResponseEntity<MessageResponse> requestRegistrationOtp(
            @RequestBody @Valid RegisterOtpRequest request,
            HttpServletRequest httpRequest) {
        authService.requestRegistrationOtp(
                request.phoneNumber(), request.role(), resolveClientIp(httpRequest));
        return ResponseEntity.ok(new MessageResponse(
                "OTP sent to " + request.phoneNumber() + ". It is valid for 10 minutes."));
    }

    // ================= REGISTRATION: STEP 2 — VERIFY OTP + CREATE ACCOUNT =====
    @PostMapping("/register/verify-otp")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterVerifyRequest request) {
        AuthResponse response = authService.register(
                request.phoneNumber(),
                request.otp(),
                request.fullName(),
                request.email(),
                request.password(),
                request.role());
        return ResponseEntity.ok(response);
    }

    // ================= LOGIN (PHONE + PASSWORD) =================
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request.phoneNumber(), request.password()));
    }

    // ================= REFRESH (ROTATES THE TOKEN PAIR) =================
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody @Valid RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    // ================= LOGOUT (REVOKES THE REFRESH TOKEN) =================
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(@RequestBody @Valid LogoutRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.ok(new MessageResponse("Logged out successfully."));
    }

    // ================= FORGOT PASSWORD (SENDS OTP) =================
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request) {
        authService.forgotPassword(request.phoneNumber());
        // Same response either way so the endpoint can't be used to probe
        // which phone numbers are registered.
        return ResponseEntity.ok(new MessageResponse(
                "If the phone number is registered, an OTP has been sent to it."));
    }

    // ================= RESET PASSWORD (OTP-DRIVEN) =================
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        authService.resetPassword(
                request.phoneNumber(),
                request.otp(),
                request.newPassword(),
                request.confirmPassword());
        return ResponseEntity.ok(new MessageResponse(
                "Password reset successfully. Please log in with your new password."));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}