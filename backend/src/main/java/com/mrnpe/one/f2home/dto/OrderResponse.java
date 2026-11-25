package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.mrnpe.one.f2home.entity.AddressMode;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderClosureReason;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;

public record OrderResponse(
        Long id,
        OrderStatus status,
        Instant responseDeadline,
        OrderClosureReason closureReason,
        boolean canCancel,
        int itemCount,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        LocalDate deliveryDate,
        BigDecimal total,
        Payment payment,
        Address address,
        List<Item> items,
        List<TimelineEvent> timeline,
        LocalDateTime createdAt
) {
    public record TimelineEvent(OrderStatus status, Instant occurredAt, String note) {}

    public record Payment(PaymentMethod method, PaymentStatus status, BigDecimal cashCollected) {
    }

    public record Address(AddressMode mode, String label, String line1, String landmark, String city,
                          String pincode, Double lat, Double lng, String contactName, String contactPhone,
                          String note) {
    }

    public record Item(Long itemId, Long productId, String productName, String farmerName, String unit, BigDecimal unitPrice,
                       int quantity, BigDecimal lineTotal, String thumbnailUrl,
                       com.mrnpe.one.f2home.entity.OrderItemStatus status) {
        static Item from(OrderItem i) {
            return new Item(
                    i.getId(),
                    i.getProductId(),
                    i.getProductName(),
                    i.getFarmerName(),
                    i.getUnit(),
                    i.getUnitPrice(),
                    i.getQuantity(),
                    i.getLineTotal(),
                    i.getThumbnailId() != null && i.getProductId() != null
                            ? ProductResponse.mediaUrl(i.getProductId(), i.getThumbnailId())
                            : null,
                    i.getStatus());
        }
    }

    public static OrderResponse from(MarketplaceOrder o) {
        return new OrderResponse(
                o.getId(),
                o.getStatus(),
                o.getResponseDeadline(),
                o.getClosureReason(),
                o.getStatus() == OrderStatus.PLACED
                        && o.getItems().stream().noneMatch(i -> i.getStatus() == com.mrnpe.one.f2home.entity.OrderItemStatus.ACCEPTED)
                        && (o.getResponseDeadline() == null || o.getResponseDeadline().isAfter(Instant.now())),
                o.getItemCount(),
                o.getSubtotal(),
                o.getDeliveryFee(),
                o.getDeliveryDate(),
                o.getTotal(),
                new Payment(o.getPaymentMethod(), o.getPaymentStatus(), o.getCashCollected()),
                new Address(o.getAddressMode(), o.getAddressLabel(), o.getAddressLine1(), o.getAddressLandmark(),
                        o.getAddressCity(), o.getAddressPincode(), o.getAddressLat(), o.getAddressLng(),
                        o.getContactName(), o.getContactPhone(), o.getDeliveryNote()),
                o.getItems().stream().map(Item::from).toList(),
                o.getEvents().stream().map(event -> new TimelineEvent(event.getStatus(), event.getOccurredAt(), event.getNote())).toList(),
                o.getCreatedAt());
    }
}
