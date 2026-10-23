package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderItemStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;

/** One order line sold by the signed-in farmer, with what they need to act on it. */
public record FarmOrderRow(
        Long itemId,
        Long orderId,
        LocalDateTime orderedAt,
        String customerName,
        String customerPhone,
        String deliveryTo,
        PaymentMethod paymentMethod,
        Long productId,
        String productName,
        String category,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal,
        OrderItemStatus status,
        LocalDateTime decidedAt) {

    public static FarmOrderRow of(MarketplaceOrder o, OrderItem i) {
        String where = String.join(", ", java.util.stream.Stream.of(o.getAddressLine1(), o.getAddressLandmark(),
                        o.getAddressCity(), o.getAddressPincode())
                .filter(s -> s != null && !s.isBlank()).toList());
        if (where.isBlank()) where = o.getAddressLabel() != null ? o.getAddressLabel() : "Current location";
        return new FarmOrderRow(i.getId(), o.getId(), o.getCreatedAt(), o.getContactName(), o.getContactPhone(),
                where, o.getPaymentMethod(), i.getProductId(), i.getProductName(), i.getCategory(), i.getUnit(),
                i.getUnitPrice(), i.getQuantity(), i.getLineTotal(), i.getStatus(), i.getDecidedAt());
    }
}
