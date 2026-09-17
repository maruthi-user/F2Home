package com.mrnpe.one.f2home.entity;

import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonCreator;

/**
 * F2HOME platform roles. Kept fully separate from the (removed) legacy role
 * enum so the two domains can never collide.
 */
public enum F2HomeRole {
    CUSTOMER,
    FARMER,
    DELIVERY_PARTNER,
    ADMIN;

    /**
     * Case-insensitive deserialization so API clients (Swagger tryouts,
     * mobile apps) can send "Farmer", "farmer", "Delivery Partner", etc.
     * The frontend always sends the exact uppercase names, which still map
     * fine. Throws IllegalArgumentException with the valid values so the
     * global handler can return a useful 400 instead of a generic
     * "malformed request body" message.
     */
    @JsonCreator
    public static F2HomeRole fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }
        String normalized = value.trim()
                .replace(' ', '_')
                .replace('-', '_')
                .toUpperCase(Locale.ROOT);
        for (F2HomeRole role : values()) {
            if (role.name().equals(normalized)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Invalid role '" + value
                + "'. Valid roles: CUSTOMER, FARMER, DELIVERY_PARTNER, ADMIN");
    }
}