package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.FulfillmentRequest;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;

@Service
public class OrderFulfillmentService {
    private final MarketplaceOrderRepository orders;

    public OrderFulfillmentService(MarketplaceOrderRepository orders) {
        this.orders = orders;
    }

    @Transactional
    public OrderResponse update(Long farmerId, Long orderId, FulfillmentRequest request) {
        var order = orders.findByIdForUpdate(orderId)
                .filter(o -> o.getResponseDeadline() != null && !o.getItems().isEmpty()
                        && o.getItems().stream().allMatch(item -> farmerId.equals(item.getFarmerId())))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        if (order.getPaymentMethod() != PaymentMethod.COD) {
            throw new BadRequestException("This fulfillment flow is for cash-on-delivery orders.");
        }

        OrderStatus target = request.status();
        String note = request.failureReason() == null ? null : request.failureReason().trim();
        BigDecimal cash = request.cashCollected();
        if (target == OrderStatus.DELIVERED) {
            if (cash == null || cash.signum() < 0 || cash.stripTrailingZeros().scale() > 2
                    || cash.compareTo(new BigDecimal("10000000000")) >= 0) {
                throw new BadRequestException("Enter the cash collected, including 0 if no cash was collected.");
            }
            cash = cash.setScale(2, RoundingMode.UNNECESSARY);
        } else if (cash != null) {
            throw new BadRequestException("Cash can only be recorded when marking an order delivered.");
        }
        if (target == OrderStatus.DELIVERY_FAILED) {
            if (note == null || note.isBlank()) throw new BadRequestException("Enter a reason for the failed delivery.");
        } else if (note != null) {
            throw new BadRequestException("A failure reason is only available for failed deliveries.");
        }

        OrderStatus current = order.getStatus();
        if (current == target) {
            if (target == OrderStatus.DELIVERED && !cash.equals(order.getCashCollected())) {
                throw new BadRequestException("Cash was already recorded for this delivery.");
            }
            if (target == OrderStatus.DELIVERY_FAILED && !Objects.equals(note,
                    order.getEvents().get(order.getEvents().size() - 1).getNote())) {
                throw new BadRequestException("This delivery failure was already recorded.");
            }
            if (target == OrderStatus.PREPARING || target == OrderStatus.OUT_FOR_DELIVERY
                    || target == OrderStatus.DELIVERED || target == OrderStatus.DELIVERY_FAILED) {
                return OrderResponse.from(order);
            }
        }
        boolean permitted = switch (target) {
            case PREPARING -> current == OrderStatus.CONFIRMED;
            case OUT_FOR_DELIVERY -> current == OrderStatus.PREPARING || current == OrderStatus.DELIVERY_FAILED;
            case DELIVERED, DELIVERY_FAILED -> current == OrderStatus.OUT_FOR_DELIVERY;
            default -> false;
        };
        if (!permitted) throw new BadRequestException("This delivery update is not available for the current order status.");

        if (target == OrderStatus.DELIVERED) {
            order.setCashCollected(cash);
            order.setPaymentStatus(cash.compareTo(order.getTotal()) == 0
                    ? PaymentStatus.PAID : PaymentStatus.COLLECTION_EXCEPTION);
        }
        order.recordStatus(target, note);
        return OrderResponse.from(orders.save(order));
    }
}
