package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.FulfillmentRequest;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;

class OrderFulfillmentServiceTest {
    private final MarketplaceOrderRepository orders = mock(MarketplaceOrderRepository.class);
    private final OrderFulfillmentService service = new OrderFulfillmentService(orders);
    private final MarketplaceOrder order = new MarketplaceOrder();

    @BeforeEach
    void setUp() {
        order.setResponseDeadline(Instant.now());
        order.setPaymentMethod(PaymentMethod.COD);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setTotal(new BigDecimal("625.00"));
        OrderItem item = new OrderItem();
        item.setFarmerId(4L);
        order.getItems().add(item);
        order.recordStatus(OrderStatus.PLACED, null);
        order.recordStatus(OrderStatus.CONFIRMED, null);
        when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(orders.save(order)).thenReturn(order);
    }

    @Test
    void recordsDeliveryAndExactCashOnce() {
        update(OrderStatus.PREPARING, null, null);
        update(OrderStatus.OUT_FOR_DELIVERY, null, null);
        update(OrderStatus.DELIVERED, "625", null);
        var result = update(OrderStatus.DELIVERED, "625.00", null);

        assertThat(result.payment().status()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.payment().cashCollected()).isEqualByComparingTo("625.00");
        assertThat(result.timeline()).extracting(OrderResponse.TimelineEvent::status)
                .containsExactly(OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING,
                        OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED);
        assertThatThrownBy(() -> update(OrderStatus.DELIVERED, "600", null)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void retainsFailedAttemptOnRetryAndFlagsCashDiscrepancy() {
        update(OrderStatus.PREPARING, null, null);
        update(OrderStatus.OUT_FOR_DELIVERY, null, null);
        update(OrderStatus.DELIVERY_FAILED, null, "Customer unavailable");
        update(OrderStatus.DELIVERY_FAILED, null, "Customer unavailable");
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        update(OrderStatus.OUT_FOR_DELIVERY, null, null);
        var result = update(OrderStatus.DELIVERED, "0", null);

        assertThat(result.payment().status()).isEqualTo(PaymentStatus.COLLECTION_EXCEPTION);
        assertThat(result.payment().cashCollected()).isEqualByComparingTo("0");
        assertThat(result.timeline()).filteredOn(event -> event.status() == OrderStatus.DELIVERY_FAILED)
                .extracting(OrderResponse.TimelineEvent::note).containsExactly("Customer unavailable");
    }

    @Test
    void rejectsUnownedOrdersSkippedStepsAndMissingDeliveryData() {
        assertThatThrownBy(() -> service.update(5L, 1L, new FulfillmentRequest(OrderStatus.PREPARING, null, null)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> update(OrderStatus.OUT_FOR_DELIVERY, null, null)).isInstanceOf(BadRequestException.class);
        update(OrderStatus.PREPARING, null, null);
        update(OrderStatus.OUT_FOR_DELIVERY, null, null);
        assertThatThrownBy(() -> update(OrderStatus.DELIVERY_FAILED, null, " ")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> update(OrderStatus.DELIVERED, null, null)).isInstanceOf(BadRequestException.class);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.OUT_FOR_DELIVERY);
    }

    private OrderResponse update(OrderStatus status, String cash, String reason) {
        return service.update(4L, 1L, new FulfillmentRequest(status, cash == null ? null : new BigDecimal(cash), reason));
    }
}
