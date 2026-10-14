package com.mrnpe.one.f2home.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Step 2 of registration: verify the OTP and create the account. Name,
 * village, role and the photo come from the registration draft created in
 * step 1, so they are not part of this payload.
 */
public record RegisterVerifyRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[\\d\\s().-]{8,20}$", message = "Enter a valid mobile number, e.g. 9876543210 or +919876543210")
        String phoneNumber,

        @NotBlank(message = "OTP is required")
        @Pattern(regexp = "^\\d{6}$", message = "OTP must be a 6-digit code")
        String otp,

        @Email(message = "Email must be a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,255}$",
                message = "Password must be at least 8 characters and contain an uppercase letter, a lowercase letter, a number and a special character"
        )
        String password
) {
}