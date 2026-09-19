package com.mrnpe.one.f2home.dto;

import com.mrnpe.one.f2home.entity.F2HomeRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Step 2 of registration: verify the OTP and create the account.
 */
public record RegisterVerifyRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[\\d\\s().-]{8,20}$", message = "Enter a valid mobile number, e.g. 9876543210 or +919876543210")
        String phoneNumber,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^\\d{6}$", message = "OTP must be a 6-digit code")
        String otp,

        @NotBlank(message = "Full name is required")
        @Size(max = 255, message = "Full name must not exceed 255 characters")
        String fullName,

        @Email(message = "Email must be a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,255}$",
                message = "Password must be at least 8 characters and contain an uppercase letter, a lowercase letter, a number and a special character"
        )
        String password,

        @NotNull(message = "Role is required")
        F2HomeRole role
) {
}