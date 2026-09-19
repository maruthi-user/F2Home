package com.mrnpe.one.f2home.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ForgotPasswordRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[\\d\\s().-]{8,20}$", message = "Enter a valid mobile number, e.g. 9876543210 or +919876543210")
        String phoneNumber
) {
}