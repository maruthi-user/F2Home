package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderClosureReason;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderItemStatus;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;

class OrderDecisionServiceTest {
    private final MarketplaceOrderRepository orders = mock(MarketplaceOrderRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final OrderDecisionService service = new OrderDecisionService(orders, products);
    private final MarketplaceOrder order = new MarketplaceOrder();
    private final Product rice = new Product();
    private final Product beans = new Product();

    @BeforeEach
    void setUp() {
        order.setCustomerId(7L);
        order.setResponseDeadline(Instant.now().plusSeconds(3600));
        order.getItems().add(line(11L, 3));
        order.getItems().add(line(12L, 4));
        rice.setQuantity(2);
        beans.setQuantity(3);
        when(orders.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(products.findByIdForUpdate(11L)).thenReturn(Optional.of(rice));
        when(products.findByIdForUpdate(12L)).thenReturn(Optional.of(beans));
    }

    @Test
    void acceptsEveryLineAndPreventsCancellationOrTimeout() {
        assertThat(service.decide(4L, 1L, true).status()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getItems()).allMatch(item -> item.getStatus() == OrderItemStatus.ACCEPTED);
        assertThatThrownBy(() -> service.cancel(7L, 1L)).isInstanceOf(BadRequestException.class);
        order.setResponseDeadline(Instant.now().minusSeconds(1));
        service.expire(1L);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verifyNoInteractions(products);
    }

    @Test
    void repeatedRejectionReleasesEachLineOnce() {
        assertThat(service.decide(4L, 1L, false).closureReason()).isEqualTo(OrderClosureReason.FARMER_REJECTED);
        service.decide(4L, 1L, false);
        service.expire(1L);
        assertReleasedOnce();
    }

    @Test
    void repeatedCancellationReleasesEachLineOnceAndPreventsAcceptance() {
        assertThat(service.cancel(7L, 1L).closureReason()).isEqualTo(OrderClosureReason.CUSTOMER_CANCELLED);
        service.cancel(7L, 1L);
        assertThatThrownBy(() -> service.decide(4L, 1L, true)).isInstanceOf(BadRequestException.class);
        assertReleasedOnce();
    }

    @Test
    void cannotAcceptAfterDeadlineEvenBeforeTheSchedulerRuns() {
        order.setResponseDeadline(Instant.now().minusSeconds(1));
        assertThat(service.decide(4L, 1L, true).closureReason()).isEqualTo(OrderClosureReason.RESPONSE_TIMEOUT);
        service.expire(1L);
        service.cancel(7L, 1L);
        assertReleasedOnce();
    }

    @Test
    void schedulerExpiresOverdueOrdersAndLeavesFutureOrdersPending() {
        service.expire(1L);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        order.setResponseDeadline(Instant.now().minusSeconds(1));
        service.expire(1L);
        service.expire(1L);
        assertThat(order.getClosureReason()).isEqualTo(OrderClosureReason.RESPONSE_TIMEOUT);
        assertReleasedOnce();
    }

    @Test
    void otherCustomersAndFarmersCannotChangeTheOrder() {
        assertThatThrownBy(() -> service.cancel(8L, 1L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.decide(5L, 1L, true)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(products);
    }

    private void assertReleasedOnce() {
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getItems()).allMatch(item -> item.getStatus() == OrderItemStatus.REJECTED);
        assertThat(rice.getQuantity()).isEqualTo(5);
        assertThat(beans.getQuantity()).isEqualTo(7);
        verify(products).findByIdForUpdate(11L);
        verify(products).findByIdForUpdate(12L);
    }

    private static OrderItem line(Long productId, int quantity) {
        OrderItem item = new OrderItem();
        item.setProductId(productId);
        item.setFarmerId(4L);
        item.setQuantity(quantity);
        return item;
    }
}
