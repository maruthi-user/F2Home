package com.mrnpe.one.f2home.security;

import com.mrnpe.one.f2home.entity.F2HomeRole;

/**
 * Immutable principal carried inside a signed F2HOME access token. Built from
 * JWT claims only — no database lookup on every request.
 */
public record F2HomeUserPrincipal(
        Long id,
        String phoneNumber,
        String fullName,
        F2HomeRole role
) {
}