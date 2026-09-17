package com.mrnpe.one.f2home.service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.mrnpe.one.f2home.exception.RateLimitException;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;

/**
 * In-memory (Bucket4j) rate limiting for the auth endpoints. Buckets are
 * keyed by phone number (and client IP for OTP requests).
 *
 * Documented limitation: buckets live in JVM memory, so limits reset per
 * instance and on restart. Fine for the current single-instance deployment;
 * switch to a shared store (Redis) if the service is horizontally scaled.
 */
@Service
public class F2HomeRateLimiter {

    private static final int OTP_REQUESTS_PER_WINDOW = 3;
    private static final Duration OTP_WINDOW = Duration.ofMinutes(10);
    private static final int LOGIN_ATTEMPTS_PER_WINDOW = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Max 3 OTP requests per phone number + IP per 10 minutes.
     *
     * @throws RateLimitException when the bucket is empty
     */
    public void assertOtpRequestAllowed(String phoneNumber, String clientIp) {
        Bucket bucket = bucket("otp:" + phoneNumber + "|" + clientIp,
                OTP_REQUESTS_PER_WINDOW, OTP_WINDOW);
        if (!bucket.tryConsume(1)) {
            throw new RateLimitException(
                    "Too many OTP requests. Please wait 10 minutes before trying again.");
        }
    }

    /**
     * Max 5 login attempts per phone number per 15 minutes. Callers consume a
     * token per attempt (success or failure) — brute-force lockout by
     * exhaustion.
     */
    public boolean tryLoginAttempt(String phoneNumber) {
        return bucket("login:" + phoneNumber, LOGIN_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW)
                .tryConsume(1);
    }

    private Bucket bucket(String key, int capacity, Duration window) {
        return buckets.computeIfAbsent(key,
                k -> Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(capacity)
                                .refillGreedy(capacity, window)
                                .build())
                        .build());
    }
}