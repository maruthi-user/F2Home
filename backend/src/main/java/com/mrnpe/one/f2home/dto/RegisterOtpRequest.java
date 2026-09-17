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
        @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Phone number must be in E.164 format, e.g. +919876543210")
        String phoneNumber,

        @NotNull(message = "Role is required")
        F2HomeRole role
) {
}