package com.mrnpe.one.f2home.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderClosureReason;
import com.mrnpe.one.f2home.entity.OrderItemStatus;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;

@Service
public class OrderDecisionService {
    private final MarketplaceOrderRepository orders;
    private final ProductRepository products;

    public OrderDecisionService(MarketplaceOrderRepository orders, ProductRepository products) {
        this.orders = orders;
        this.products = products;
    }

    @Transactional
    public OrderResponse decide(Long farmerId, Long orderId, boolean accept) {
        MarketplaceOrder order = lock(orderId);
        if (order.getResponseDeadline() == null || order.getItems().isEmpty()
                || order.getItems().stream().anyMatch(item -> !farmerId.equals(item.getFarmerId()))) {
            throw new ResourceNotFoundException("Order not found.");
        }
        if (expireIfDue(order)) return OrderResponse.from(order);
        if (order.getClosureReason() == OrderClosureReason.RESPONSE_TIMEOUT) {
            return OrderResponse.from(order);
        }
        if ((accept && order.getStatus() == OrderStatus.CONFIRMED)
                || (!accept && order.getClosureReason() == OrderClosureReason.FARMER_REJECTED)) {
            return OrderResponse.from(order);
        }
        requirePending(order);
        if (accept) {
            LocalDateTime now = LocalDateTime.now();
            order.getItems().forEach(item -> {
                item.setStatus(OrderItemStatus.ACCEPTED);
                item.setDecidedAt(now);
            });
            order.recordStatus(OrderStatus.CONFIRMED, null);
        } else {
            close(order, OrderClosureReason.FARMER_REJECTED);
        }
        orders.save(order);
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse cancel(Long customerId, Long orderId) {
        MarketplaceOrder order = lock(orderId);
        if (!customerId.equals(order.getCustomerId())) {
            throw new ResourceNotFoundException("Order not found.");
        }
        if (expireIfDue(order) || order.getClosureReason() == OrderClosureReason.RESPONSE_TIMEOUT
                || order.getClosureReason() == OrderClosureReason.CUSTOMER_CANCELLED) {
            return OrderResponse.from(order);
        }
        requirePending(order);
        if (order.getItems().stream().anyMatch(item -> item.getStatus() == OrderItemStatus.ACCEPTED)) {
            throw new BadRequestException("An accepted order can no longer be cancelled here.");
        }
        close(order, OrderClosureReason.CUSTOMER_CANCELLED);
        orders.save(order);
        return OrderResponse.from(order);
    }

    @Transactional
    public void expire(Long orderId) {
        orders.findByIdForUpdate(orderId).ifPresent(this::expireIfDue);
    }

    private boolean expireIfDue(MarketplaceOrder order) {
        if (order.getStatus() != OrderStatus.PLACED || order.getResponseDeadline() == null
                || order.getResponseDeadline().isAfter(Instant.now())) return false;
        close(order, OrderClosureReason.RESPONSE_TIMEOUT);
        orders.save(order);
        return true;
    }

    private MarketplaceOrder lock(Long orderId) {
        return orders.findByIdForUpdate(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found."));
    }

    private static void requirePending(MarketplaceOrder order) {
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new BadRequestException("This order is no longer awaiting a farmer response.");
        }
    }

    // All callers hold the order lock. Only pending lines still hold stock.
    private void close(MarketplaceOrder order, OrderClosureReason reason) {
        Map<Long, Integer> released = new TreeMap<>();
        LocalDateTime now = LocalDateTime.now();
        order.getItems().stream().filter(item -> item.getStatus() == OrderItemStatus.PENDING).forEach(item -> {
            if (item.getProductId() != null) released.merge(item.getProductId(), item.getQuantity(), Integer::sum);
            item.setStatus(OrderItemStatus.REJECTED);
            item.setDecidedAt(now);
        });
        released.forEach((id, quantity) -> products.findByIdForUpdate(id).ifPresent(product -> {
            product.setQuantity(product.getQuantity() + quantity);
            products.save(product);
        }));
        order.recordStatus(OrderStatus.CANCELLED, null);
        order.setClosureReason(reason);
    }
}
