package com.mrnpe.one.f2home.service;

/**
 * Pluggable SMS transport. No vendor SDK is pinned yet — when an SMS vendor
 * is chosen (e.g. MSG91 for the India market), add a second implementation of
 * this interface annotated as the primary bean and remove {@code @Component}
 * from {@link LoggingSmsSender}. Nothing else in the auth stack changes.
 */
public interface SmsSender {

    /**
     * Sends a plain-text SMS to the given E.164 phone number.
     * Implementations must never throw for business reasons; transport
     * failures should be logged and rethrown as a RuntimeException so the
     * caller can return a 502-style error instead of silently pretending the
     * OTP was delivered.
     */
    void sendSms(String phoneNumber, String message);
}