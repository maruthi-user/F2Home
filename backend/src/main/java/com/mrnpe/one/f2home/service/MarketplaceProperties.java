package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Marketplace business rules, sourced from application.properties
 * (f2home.marketplace.*) so dev and prod can differ without a code change.
 */
@Component
public class MarketplaceProperties {

    @Value("${f2home.marketplace.nearby-radius-km:20}")
    private double nearbyRadiusKm;

    @Value("${f2home.marketplace.min-order-items:5}")
    private int minOrderItems;

    @Value("${f2home.marketplace.min-order-value:500}")
    private BigDecimal minOrderValue;

    @Value("${f2home.marketplace.max-image-bytes:4194304}")
    private long maxImageBytes;

    @Value("${f2home.marketplace.max-images-per-product:5}")
    private int maxImagesPerProduct;

    @Value("${f2home.marketplace.max-video-bytes:26214400}")
    private long maxVideoBytes;

    /** Perishables auto-expire this many hours after listing. */
    @Value("${f2home.marketplace.perishable-expiry-hours:48}")
    private int perishableExpiryHours = 48;

    /** Comma-separated category ids treated as perishable (cannot be stored > 2 days). */
    @Value("${f2home.marketplace.perishable-categories:vegetables,fruits}")
    private String perishableCategories = "vegetables,fruits";

    public MarketplaceProperties() {
    }

    /** Test/explicit constructor. */
    public MarketplaceProperties(double nearbyRadiusKm, int minOrderItems, BigDecimal minOrderValue,
                                 long maxImageBytes, int maxImagesPerProduct, long maxVideoBytes) {
        this.nearbyRadiusKm = nearbyRadiusKm;
        this.minOrderItems = minOrderItems;
        this.minOrderValue = minOrderValue;
        this.maxImageBytes = maxImageBytes;
        this.maxImagesPerProduct = maxImagesPerProduct;
        this.maxVideoBytes = maxVideoBytes;
    }

    public int getPerishableExpiryHours() { return perishableExpiryHours; }

    public boolean isPerishableCategory(String category) {
        if (category == null) return false;
        for (String c : perishableCategories.split(",")) {
            if (c.trim().equalsIgnoreCase(category.trim())) return true;
        }
        return false;
    }

    public double getNearbyRadiusKm() { return nearbyRadiusKm; }
    public int getMinOrderItems() { return minOrderItems; }
    public BigDecimal getMinOrderValue() { return minOrderValue; }
    public long getMaxImageBytes() { return maxImageBytes; }
    public int getMaxImagesPerProduct() { return maxImagesPerProduct; }
    public long getMaxVideoBytes() { return maxVideoBytes; }
}
