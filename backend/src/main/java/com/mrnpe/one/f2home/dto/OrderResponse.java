package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.mrnpe.one.f2home.entity.AddressMode;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;

public record OrderResponse(
        Long id,
        OrderStatus status,
        int itemCount,
        BigDecimal subtotal,
        BigDecimal total,
        Payment payment,
        Address address,
        List<Item> items,
        LocalDateTime createdAt
) {
    public record Payment(PaymentMethod method, PaymentStatus status) {
    }

    public record Address(AddressMode mode, String label, String line1, String landmark, String city,
                          String pincode, Double lat, Double lng, String contactName, String contactPhone,
                          String note) {
    }

    public record Item(Long productId, String productName, String farmerName, String unit, BigDecimal unitPrice,
                       int quantity, BigDecimal lineTotal, String thumbnailUrl) {
        static Item from(OrderItem i) {
            return new Item(
                    i.getProductId(),
                    i.getProductName(),
                    i.getFarmerName(),
                    i.getUnit(),
                    i.getUnitPrice(),
                    i.getQuantity(),
                    i.getLineTotal(),
                    i.getThumbnailId() != null && i.getProductId() != null
                            ? ProductResponse.mediaUrl(i.getProductId(), i.getThumbnailId())
                            : null);
        }
    }

    public static OrderResponse from(MarketplaceOrder o) {
        return new OrderResponse(
                o.getId(),
                o.getStatus(),
                o.getItemCount(),
                o.getSubtotal(),
                o.getTotal(),
                new Payment(o.getPaymentMethod(), o.getPaymentStatus()),
                new Address(o.getAddressMode(), o.getAddressLabel(), o.getAddressLine1(), o.getAddressLandmark(),
                        o.getAddressCity(), o.getAddressPincode(), o.getAddressLat(), o.getAddressLng(),
                        o.getContactName(), o.getContactPhone(), o.getDeliveryNote()),
                o.getItems().stream().map(Item::from).toList(),
                o.getCreatedAt());
    }
}
