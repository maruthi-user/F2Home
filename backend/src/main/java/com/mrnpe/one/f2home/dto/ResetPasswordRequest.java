package com.mrnpe.one.f2home.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Phone number must be in E.164 format, e.g. +919876543210")
        String phoneNumber,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^\\d{6}$", message = "OTP must be a 6-digit code")
        String otp,

        @NotBlank(message = "New password is required")
        String newPassword,

        @NotBlank(message = "Password confirmation is required")
        String confirmPassword
) {
}