package com.mrnpe.one.f2home.dto;

import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;

/**
 * Public shape of an authenticated user (returned in every auth response).
 */
public record UserResponse(
        Long id,
        String phoneNumber,
        String email,
        String fullName,
        F2HomeRole role,
        F2HomeUserStatus status,
        boolean phoneVerified
) {
    public static UserResponse from(F2HomeUser user) {
        return new UserResponse(
                user.getId(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getStatus(),
                user.isPhoneVerified());
    }
}