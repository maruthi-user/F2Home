package com.mrnpe.one.f2home.exception;

import com.mrnpe.one.exception.BadRequestException;

/** A verification failure whose attempt or expiration must be committed. */
public class OtpVerificationException extends BadRequestException {
    public OtpVerificationException(String message) {
        super(message);
    }
}
