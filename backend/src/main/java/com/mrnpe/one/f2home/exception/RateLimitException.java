package com.mrnpe.one.f2home.exception;

/**
 * Thrown when a rate limit (OTP requests, failed login attempts) is exceeded.
 * Mapped to HTTP 429 by the shared GlobalExceptionHandler.
 */
public class RateLimitException extends RuntimeException {

    public RateLimitException(String message) {
        super(message);
    }
}