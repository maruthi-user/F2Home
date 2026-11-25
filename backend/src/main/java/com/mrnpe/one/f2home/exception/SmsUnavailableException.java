package com.mrnpe.one.f2home.exception;

/** Public-safe failure. Gateway exceptions may contain the SMS body and must stay out of the cause chain. */
public class SmsUnavailableException extends RuntimeException {
    private final boolean deliveryFailure;

    public SmsUnavailableException(boolean deliveryFailure) {
        super("SMS verification is temporarily unavailable. Please try again later.");
        this.deliveryFailure = deliveryFailure;
    }

    public boolean isDeliveryFailure() { return deliveryFailure; }
}
