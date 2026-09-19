package com.mrnpe.one.f2home.entity;

/**
 * Payment methods the checkout can name. Only COD is live; CARD and UPI are
 * declared now so enabling them later is a flag flip plus a gateway step in
 * OrderService, not a schema or API change.
 */
public enum PaymentMethod {
    COD(true),
    CARD(false),
    UPI(false);

    private final boolean enabled;

    PaymentMethod(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }
}
