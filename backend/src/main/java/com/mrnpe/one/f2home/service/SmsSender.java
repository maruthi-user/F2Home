package com.mrnpe.one.f2home.service;

/** SMS transport provided by a configured gateway or by a test fixture. */
public interface SmsSender {
    /**
     * Send to an E.164 number. Throw if the gateway cannot accept the message.
     * Implementations must keep message bodies, recipient numbers and credentials out of logs.
     */
    void sendSms(String phoneNumber, String message);
}
