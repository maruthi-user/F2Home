package com.mrnpe.one.f2home.dto;

/**
 * Token pair returned by register / login / refresh. {@code expiresIn} is the
 * access-token lifetime in milliseconds (the frontend stores the JWT's own
 * {@code exp} claim for session-expiry watching).
 */
public record AuthResponse(
        String accessToken,
        long expiresIn,
        String refreshToken,
        UserResponse user
) {
}