package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderItemStatus;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@ExtendWith(MockitoExtension.class)
class FarmOrderServiceTest {

    @Mock private MarketplaceOrderRepository orders;
    @Mock private ProductRepository products;

    private FarmOrderService service;
    private final F2HomeUserPrincipal ravi = new F2HomeUserPrincipal(1L, "+919000000001", "Ravi", F2HomeRole.FARMER);
    private final F2HomeUserPrincipal other = new F2HomeUserPrincipal(2L, "+919000000002", "Other", F2HomeRole.FARMER);

    private MarketplaceOrder order;
    private OrderItem item;
    private Product product;

    @BeforeEach
    void setUp() throws Exception {
        service = new FarmOrderService(orders, products);
        item = new OrderItem();
        var id = OrderItem.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(item, 10L);
        item.setProductId(5L);
        item.setFarmerId(1L);
        item.setQuantity(5);
        item.setLineTotal(new BigDecimal("600"));
        order = new MarketplaceOrder();
        order.getItems().add(item);
        product = new Product();
        product.setQuantity(45);
        lenient().when(orders.findByItemId(10L)).thenReturn(Optional.of(order));
        lenient().when(products.findByIdForUpdate(5L)).thenReturn(Optional.of(product));
    }

    @Test
    void acceptConfirmsTheOrderAndKeepsStock() {
        service.decide(ravi, 10L, true);
        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.ACCEPTED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(product.getQuantity()).isEqualTo(45);
    }

    @Test
    void rejectRestoresStockAndCancelsAnOrderWithNoOtherLines() {
        service.decide(ravi, 10L, false);
        assertThat(item.getStatus()).isEqualTo(OrderItemStatus.REJECTED);
        assertThat(product.getQuantity()).isEqualTo(50);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getTotal()).isEqualByComparingTo("0");
    }

    @Test
    void onlyTheOwningFarmerCanDecideAndOnlyOnce() {
        assertThatThrownBy(() -> service.decide(other, 10L, true)).isInstanceOf(AccessDeniedException.class);
        service.decide(ravi, 10L, true);
        assertThatThrownBy(() -> service.decide(ravi, 10L, false)).isInstanceOf(BadRequestException.class);
    }
}
