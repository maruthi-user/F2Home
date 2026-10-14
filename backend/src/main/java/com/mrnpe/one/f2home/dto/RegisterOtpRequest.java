package com.mrnpe.one.f2home.dto;

import com.mrnpe.one.f2home.entity.F2HomeRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Step 1 of registration (the JSON part of the multipart request, the other
 * part being the self-taken photo): collect the profile, request an OTP.
 * Everything here is parked in a registration draft until the OTP is
 * verified, which is when the account row is actually created.
 */
public record RegisterOtpRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[\\d\\s().-]{8,20}$", message = "Enter a valid mobile number, e.g. 9876543210 or +919876543210")
        String phoneNumber,

        @NotBlank(message = "Full name is required")
        @Size(max = 255, message = "Full name must not exceed 255 characters")
        String fullName,

        @NotBlank(message = "Village is required")
        @Size(max = 120, message = "Village must not exceed 120 characters")
        String village,

        @NotNull(message = "Role is required")
        F2HomeRole role
) {
}
