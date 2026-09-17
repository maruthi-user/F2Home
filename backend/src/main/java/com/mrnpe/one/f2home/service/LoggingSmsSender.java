package com.mrnpe.one.f2home.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Default {@link SmsSender}: logs the SMS instead of sending it, so local/dev
 * testing never burns real SMS credits. The OTP is visible in the backend log
 * (grep for "SMS to"). Replace with a vendor-backed implementation once an
 * SMS provider account is chosen.
 */
@Component
public class LoggingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsSender.class);

    @Override
    public void sendSms(String phoneNumber, String message) {
        log.info("[LoggingSmsSender] SMS to {} : {}", phoneNumber, message);
    }
}