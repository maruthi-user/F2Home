package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.util.List;

import com.mrnpe.one.f2home.entity.PaymentMethod;

/**
 * The server-side rules the UI mirrors (so they are configured in exactly
 * one place - application.properties - and the client never drifts).
 */
public record MarketplaceRulesResponse(
        double nearbyRadiusKm,
        int minOrderItems,
        BigDecimal minOrderValue,
        long maxImageBytes,
        int maxImagesPerProduct,
        long maxVideoBytes,
        List<PaymentMethodInfo> paymentMethods
) {
    public record PaymentMethodInfo(PaymentMethod id, boolean enabled) {
    }
}
