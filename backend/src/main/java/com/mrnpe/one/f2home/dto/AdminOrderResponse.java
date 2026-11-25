package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderResolution;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentStatus;

public record AdminOrderResponse(OrderResponse order, String customerName, String customerPhone,
                                 List<String> farms, boolean openCashIssue, List<Resolution> resolutions) {
    public record Results(List<Summary> orders, boolean hasNext) {}

    public record Summary(Long id, String customerName, String customerPhone, List<String> farms,
                          OrderStatus status, PaymentStatus paymentStatus, BigDecimal total,
                          LocalDate deliveryDate) {
        public static Summary from(MarketplaceOrder order) {
            return new Summary(order.getId(), order.getCustomerName(), order.getCustomerPhone(), farmNames(order),
                    order.getStatus(), order.getPaymentStatus(), order.getTotal(), order.getDeliveryDate());
        }
    }

    public record Resolution(Long id, Long adminId, String adminName, Instant resolvedAt, OrderResolution.Action action,
                             String reason, OrderStatus previousStatus, OrderStatus resultingStatus,
                             BigDecimal previousCash, BigDecimal resultingCash) {
        static Resolution from(OrderResolution entry) {
            return new Resolution(entry.getId(), entry.getAdminId(), entry.getAdminName(), entry.getResolvedAt(),
                    entry.getAction(), entry.getReason(), entry.getPreviousStatus(), entry.getResultingStatus(),
                    entry.getPreviousCash(), entry.getResultingCash());
        }
    }

    public static AdminOrderResponse from(MarketplaceOrder order, boolean openCashIssue, List<OrderResolution> history) {
        return new AdminOrderResponse(OrderResponse.from(order), order.getCustomerName(), order.getCustomerPhone(),
                farmNames(order), openCashIssue, history.stream().map(Resolution::from).toList());
    }

    private static List<String> farmNames(MarketplaceOrder order) {
        return order.getItems().stream().map(OrderItem::getFarmerName).filter(java.util.Objects::nonNull).distinct().toList();
    }
}
