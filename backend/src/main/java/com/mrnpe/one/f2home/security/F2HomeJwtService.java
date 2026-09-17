package com.mrnpe.one.f2home.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * F2HOME access-token service. Uses its own signing secret
 * ({@code f2home.jwt.secret-key}) — deliberately separate from any other
 * token issuer so token shapes and lifetimes never collide.
 */
@Service
public class F2HomeJwtService {

    @Value("${f2home.jwt.secret-key}")
    private String secretKey;

    @Value("${f2home.jwt.expiration-time}")
    private long expirationTime;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }

    public String generateToken(F2HomeUser user) {
        return Jwts.builder()
                .subject(user.getPhoneNumber())
                .claim("uid", user.getId())
                .claim("role", user.getRole().name())
                .claim("fullName", user.getFullName())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationTime))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Parses and validates a signed access token. Returns the principal, or
     * {@code null} when the token is malformed, tampered with, or expired.
     */
    public F2HomeUserPrincipal parseToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (claims.getExpiration().before(new Date())) {
                return null;
            }

            String roleRaw = claims.get("role", String.class);
            F2HomeRole role = roleRaw == null ? null : F2HomeRole.valueOf(roleRaw);

            Object uidRaw = claims.get("uid");
            Long uid = uidRaw instanceof Number number ? number.longValue() : null;

            return new F2HomeUserPrincipal(
                    uid,
                    claims.getSubject(),
                    claims.get("fullName", String.class),
                    role);
        } catch (Exception e) {
            return null;
        }
    }

    public long getExpirationTime() {
        return expirationTime;
    }
}