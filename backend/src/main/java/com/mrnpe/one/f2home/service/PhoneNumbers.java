package com.mrnpe.one.f2home.service;

import java.util.regex.Pattern;

import com.mrnpe.one.exception.BadRequestException;

/**
 * Turns whatever a user types as a mobile number into the canonical E.164
 * form the database stores (e.g. {@code +919876543210}).
 *
 * Accepted inputs (spaces, dashes and brackets are ignored):
 * <ul>
 *   <li>{@code 9876543210}      - 10 digits: Indian mobile, gets the default +91</li>
 *   <li>{@code 09876543210}     - trunk-prefixed Indian mobile</li>
 *   <li>{@code 919876543210}    - country code without the plus</li>
 *   <li>{@code +919876543210}   - already E.164 (any country)</li>
 *   <li>{@code 00919876543210}  - international dialling prefix</li>
 * </ul>
 */
public final class PhoneNumbers {

    /** The app launches in India; bare 10-digit numbers get this code. */
    public static final String DEFAULT_COUNTRY_CODE = "+91";

    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{7,14}$");
    private static final Pattern INDIAN_MOBILE = Pattern.compile("^[6-9]\\d{9}$");

    private PhoneNumbers() {
    }

    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Phone number is required");
        }
        String s = raw.replaceAll("[\\s\\-().]", "");

        if (s.startsWith("00")) {
            s = "+" + s.substring(2);
        } else if (!s.startsWith("+")) {
            if (s.length() == 11 && s.startsWith("0")) {
                s = s.substring(1); // 0 98765 43210 -> 98765 43210
            }
            if (INDIAN_MOBILE.matcher(s).matches()) {
                s = DEFAULT_COUNTRY_CODE + s;
            } else if (s.length() == 12 && s.startsWith("91") && INDIAN_MOBILE.matcher(s.substring(2)).matches()) {
                s = "+" + s;
            }
            // Anything else without a "+" is ambiguous (which country?) and
            // falls through to the E.164 check below, which rejects it.
        }

        if (!E164.matcher(s).matches()) {
            throw new BadRequestException(
                    "Enter a valid mobile number - 10 digits for India (e.g. 9876543210) or with country code (e.g. +919876543210)");
        }
        return s;
    }
}
