package com.mrnpe.one.f2home.dto;

import com.mrnpe.one.f2home.entity.F2HomeRole;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Step 1 of registration: request an OTP for the given phone number.
 */
public record RegisterOtpRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[\\d\\s().-]{8,20}$", message = "Enter a valid mobile number, e.g. 9876543210 or +919876543210")
        String phoneNumber,

        @NotNull(message = "Role is required")
        F2HomeRole role
) {
}