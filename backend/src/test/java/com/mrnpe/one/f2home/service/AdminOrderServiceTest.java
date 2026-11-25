package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.ResolveOrderRequest;
import com.mrnpe.one.f2home.entity.F2HomeRole;
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

class AdminOrderServiceTest {
    private final MarketplaceOrderRepository orders = mock(MarketplaceOrderRepository.class);
    private final OrderResolutionRepository resolutions = mock(OrderResolutionRepository.class);
    private final AdminOrderService service = new AdminOrderService(orders, resolutions);
    private final MarketplaceOrder order = new MarketplaceOrder();
    private final List<OrderResolution> history = new ArrayList<>();
    private final F2HomeUserPrincipal admin = new F2HomeUserPrincipal(9L, "5550100", "Test Admin", F2HomeRole.ADMIN);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(order, "id", 1L);
        order.setPaymentMethod(PaymentMethod.COD);
        order.setTotal(new BigDecimal("650.00"));
        when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(resolutions.findByOrderIdOrderByIdAsc(1L)).thenAnswer(invocation -> List.copyOf(history));
        when(resolutions.save(any(OrderResolution.class))).thenAnswer(invocation -> {
            OrderResolution entry = invocation.getArgument(0);
            history.add(entry);
            return entry;
        });
    }

    @Test
    void failedDeliveryCanBeSentBackToPreparingWithPrivateAuditReason() {
        order.recordStatus(OrderStatus.DELIVERY_FAILED, "Customer unavailable");
        var result = service.resolve(admin, 1L, new ResolveOrderRequest(Action.RETRY_DELIVERY, "Customer confirmed they are home"));

        assertThat(result.order().status()).isEqualTo(OrderStatus.PREPARING);
        assertThat(result.order().timeline().get(1).note()).isEqualTo("Support arranged another delivery attempt.");
        var entry = result.resolutions().get(0);
        assertThat(entry.adminId()).isEqualTo(9L);
        assertThat(entry.adminName()).isEqualTo("Test Admin");
        assertThat(entry.reason()).isEqualTo("Customer confirmed they are home");
        assertThat(entry.resolvedAt()).isNotNull();
        assertThat(entry.previousStatus()).isEqualTo(OrderStatus.DELIVERY_FAILED);
        assertThat(entry.resultingStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThatThrownBy(() -> service.resolve(admin, 1L, new ResolveOrderRequest(Action.CLOSE_FAILED_DELIVERY, "Stale action")))
                .isInstanceOf(IllegalStateException.class);
        assertThat(history).hasSize(1);
    }

    @Test
    void closingFailedDeliveryRecordsTheClosureReason() {
        order.recordStatus(OrderStatus.DELIVERY_FAILED, "Delivery failed");
        var result = service.resolve(admin, 1L, new ResolveOrderRequest(Action.CLOSE_FAILED_DELIVERY, "Customer declined retry"));

        assertThat(result.order().status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(result.order().closureReason()).isEqualTo(OrderClosureReason.ADMIN_CLOSED_DELIVERY);
    }

    @Test
    void confirmingFullCashUpdatesPaymentAndAuditsBeforeAndAfter() {
        cashDiscrepancy();
        var result = service.resolve(admin, 1L, new ResolveOrderRequest(Action.CONFIRM_FULL_CASH, "Verified cash with farmer"));
        assertThat(result.openCashIssue()).isFalse();
        assertThat(result.order().payment().status()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.resolutions().get(0).previousCash()).isEqualByComparingTo("600");
        assertThat(result.resolutions().get(0).resultingCash()).isEqualByComparingTo("650");
    }

    @Test
    void keepingRecordedCashClosesTheIssueWithoutChangingPayment() {
        cashDiscrepancy();
        assertThatThrownBy(() -> service.resolve(admin, 1L, new ResolveOrderRequest(Action.KEEP_RECORDED_CASH, " ")))
                .isInstanceOf(BadRequestException.class);
        var result = service.resolve(admin, 1L, new ResolveOrderRequest(Action.KEEP_RECORDED_CASH, "Confirmed amount recorded"));
        assertThat(result.openCashIssue()).isFalse();
        assertThat(result.order().payment().status()).isEqualTo(PaymentStatus.COLLECTION_EXCEPTION);
        assertThat(result.order().payment().cashCollected()).isEqualByComparingTo("600");
        assertThatThrownBy(() -> service.resolve(admin, 1L, new ResolveOrderRequest(Action.CONFIRM_FULL_CASH, "Duplicate")))
                .isInstanceOf(IllegalStateException.class);
        assertThat(history).hasSize(1);
    }

    private void cashDiscrepancy() {
        order.setStatus(OrderStatus.DELIVERED);
        order.setPaymentStatus(PaymentStatus.COLLECTION_EXCEPTION);
        order.setCashCollected(new BigDecimal("600.00"));
    }
}
