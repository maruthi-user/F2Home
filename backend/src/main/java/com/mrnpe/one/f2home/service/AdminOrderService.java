package com.mrnpe.one.f2home.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.AdminOrderResponse;
import com.mrnpe.one.f2home.dto.ResolveOrderRequest;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderClosureReason;
import com.mrnpe.one.f2home.entity.OrderResolution;
import com.mrnpe.one.f2home.entity.OrderResolution.Action;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.OrderResolutionRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@Service
public class AdminOrderService {
    public enum Filter { ALL, DELIVERY, CASH, SUPPORT, RESOLVED }

    private final MarketplaceOrderRepository orders;
    private final OrderResolutionRepository resolutions;

    public AdminOrderService(MarketplaceOrderRepository orders, OrderResolutionRepository resolutions) {
        this.orders = orders;
        this.resolutions = resolutions;
    }

    @Transactional(readOnly = true)
    public AdminOrderResponse.Results lookup(String query, Filter filter, int page) {
        if (page < 0) throw new BadRequestException("Page must be non-negative.");
        String term = query.strip().toLowerCase(Locale.ROOT);
        if (term.length() > 120) throw new BadRequestException("Search is too long.");
        Long reference = null;
        try {
            reference = Long.valueOf(term.startsWith("#") ? term.substring(1) : term);
        } catch (NumberFormatException ignored) {
            // Non-numeric searches match names and phone numbers.
        }
        var matches = orders.searchForAdmin(term, reference, filter == Filter.DELIVERY, filter == Filter.CASH,
                filter == Filter.RESOLVED, filter == Filter.SUPPORT, List.of(Action.CONFIRM_FULL_CASH, Action.KEEP_RECORDED_CASH), PageRequest.of(page, 20));
        return new AdminOrderResponse.Results(matches.getContent().stream().map(AdminOrderResponse.Summary::from).toList(),
                matches.hasNext());
    }

    @Transactional(readOnly = true)
    public AdminOrderResponse detail(Long id) {
        return response(orders.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found.")));
    }

    @Transactional
    public AdminOrderResponse resolve(F2HomeUserPrincipal admin, Long id, ResolveOrderRequest request) {
        MarketplaceOrder order = orders.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        List<OrderResolution> history = resolutions.findByOrderIdOrderByIdAsc(id);
        Action action = request.action();
        String reason = request.reason().strip();
        if (reason.isBlank()) throw new BadRequestException("Enter a resolution reason.");
        OrderResolution audit = new OrderResolution(order, admin, action, reason);

        switch (action) {
            case RETRY_DELIVERY, CLOSE_FAILED_DELIVERY -> {
                if (order.getStatus() != OrderStatus.DELIVERY_FAILED) {
                    throw new IllegalStateException("This order no longer has a failed delivery to resolve.");
                }
                if (action == Action.RETRY_DELIVERY) {
                    order.recordStatus(OrderStatus.PREPARING, "Support arranged another delivery attempt.");
                } else {
                    order.setClosureReason(OrderClosureReason.ADMIN_CLOSED_DELIVERY);
                    order.recordStatus(OrderStatus.CANCELLED, null);
                }
            }
            case CONFIRM_FULL_CASH, KEEP_RECORDED_CASH -> {
                if (!hasOpenCashIssue(order, history)) {
                    throw new IllegalStateException("This order no longer has an open cash discrepancy.");
                }
                if (action == Action.CONFIRM_FULL_CASH) {
                    order.setCashCollected(order.getTotal());
                    order.setPaymentStatus(PaymentStatus.PAID);
                }
            }
        }

        audit.captureResult(order);
        var updatedHistory = new ArrayList<>(history);
        updatedHistory.add(resolutions.save(audit));
        return AdminOrderResponse.from(order, hasOpenCashIssue(order, updatedHistory), updatedHistory);
    }

    private AdminOrderResponse response(MarketplaceOrder order) {
        var history = resolutions.findByOrderIdOrderByIdAsc(order.getId());
        return AdminOrderResponse.from(order, hasOpenCashIssue(order, history), history);
    }

    private static boolean hasOpenCashIssue(MarketplaceOrder order, List<OrderResolution> history) {
        return order.getStatus() == OrderStatus.DELIVERED && order.getPaymentMethod() == PaymentMethod.COD
                && order.getPaymentStatus() == PaymentStatus.COLLECTION_EXCEPTION
                && history.stream().noneMatch(entry -> entry.getAction().isCashResolution());
    }
}
