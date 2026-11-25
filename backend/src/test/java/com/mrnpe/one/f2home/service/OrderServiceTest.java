package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest;
import com.mrnpe.one.f2home.entity.AddressMode;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductMediaRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final UUID ATTEMPT_ID = UUID.fromString("b6382832-b238-468d-85c1-acb0f640fe22");

    @Mock private MarketplaceOrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductMediaRepository mediaRepository;

    private OrderService service;

    private final F2HomeUserPrincipal customer =
            new F2HomeUserPrincipal(3L, "+919000000003", "Anita Sharma", F2HomeRole.CUSTOMER);

    @Mock
    private F2HomeUserRepository userRepository;

    @BeforeEach
    void setUp() {
        MarketplaceProperties props = new MarketplaceProperties(
                20, 5, new BigDecimal("500"), 4_194_304, 5, 26_214_400);
        service = new OrderService(orderRepository, productRepository, mediaRepository, props, userRepository, new ObjectMapper());
        F2HomeUser farmer = new F2HomeUser();
        farmer.setStatus(F2HomeUserStatus.ACTIVE);
        farmer.setFarmLat(16.3);
        farmer.setFarmLng(80.44);
        farmer.setDeliveryRadiusKm(10.0);
        farmer.setDeliveryDays("MON,TUE,WED,THU,FRI,SAT,SUN");
        lenient().when(userRepository.lockForCheckout(customer.id())).thenReturn(Optional.of(new F2HomeUser()));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(farmer));

        lenient().when(orderRepository.save(any(MarketplaceOrder.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(mediaRepository.findByProductIdOrderBySortOrderAsc(anyLong())).thenReturn(List.of());
    }

    private Product product(long id, String name, String price, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(1L);
        p.setFarmerName("Ravi Kumar");
        p.setName(name);
        p.setCategory("vegetables");
        p.setPrice(new BigDecimal(price));
        p.setUnit("kg");
        p.setQuantity(stock);
        p.setLocationLabel("Guntur");
        p.setLat(16.3);
        p.setLng(80.44);
        p.setStatus(ProductStatus.ACTIVE);
        return p;
    }

    private static PlaceOrderRequest.Address manualAddress() {
        return new PlaceOrderRequest.Address(AddressMode.MANUAL, null, "12-3-45 Brodipet", null,
                "Guntur", "522002", 16.3, 80.44, "Anita Sharma", "+919000000003", null);
    }

    private static PlaceOrderRequest request(PaymentMethod method, PlaceOrderRequest.Address address,
                                             PlaceOrderRequest.Line... lines) {
        return new PlaceOrderRequest(List.of(lines), address, method, null);
    }

    private OrderResponse place(PlaceOrderRequest request) {
        return service.place(customer, request, ATTEMPT_ID);
    }

    private PlaceOrderRequest reviewed(PlaceOrderRequest request) {
        return new PlaceOrderRequest(request.items(), request.address(), request.paymentMethod(), service.quote(request).version());
    }

    @Test
    void placesOrderRepricedFromProductsAndDecrementsStock() {
        Product rice = product(1L, "Sona Masoori Rice", "65", 500);
        Product tomatoes = product(2L, "Fresh Tomatoes", "40", 100);
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(rice));
        when(productRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(tomatoes));
        when(productRepository.findById(1L)).thenReturn(Optional.of(rice));
        when(productRepository.findById(2L)).thenReturn(Optional.of(tomatoes));

        OrderResponse response = place(reviewed(request(PaymentMethod.COD, manualAddress(),
                new PlaceOrderRequest.Line(1L, 6),
                new PlaceOrderRequest.Line(2L, 3))));

        assertThat(response.itemCount()).isEqualTo(9);
        assertThat(response.deliveryDate()).isEqualTo(LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(1));
        assertThat(response.deliveryFee()).isEqualByComparingTo("0");
        assertThat(response.subtotal()).isEqualByComparingTo("510.00");
        assertThat(response.total()).isEqualByComparingTo("510.00");
        assertThat(response.payment().method()).isEqualTo(PaymentMethod.COD);
        assertThat(response.payment().status()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.items()).extracting("productName").containsExactly("Sona Masoori Rice", "Fresh Tomatoes");

        // stock decremented on the locked rows
        assertThat(rice.getQuantity()).isEqualTo(494);
        assertThat(tomatoes.getQuantity()).isEqualTo(97);

        ArgumentCaptor<MarketplaceOrder> saved = ArgumentCaptor.forClass(MarketplaceOrder.class);
        verify(orderRepository).save(saved.capture());
        assertThat(saved.getValue().getCustomerId()).isEqualTo(3L);
        assertThat(saved.getValue().getAddressCity()).isEqualTo("Guntur");
    }

    @Test
    void replayReturnsTheExistingOrderWithoutCheckingOrReservingStockAgain() {
        Product rice = product(1L, "Rice", "100", 6);
        when(productRepository.findById(1L)).thenReturn(Optional.of(rice));
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(rice));
        PlaceOrderRequest request = reviewed(request(PaymentMethod.COD, manualAddress(), new PlaceOrderRequest.Line(1L, 6)));
        place(request);

        ArgumentCaptor<MarketplaceOrder> saved = ArgumentCaptor.forClass(MarketplaceOrder.class);
        verify(orderRepository).save(saved.capture());
        MarketplaceOrder order = saved.getValue();
        when(orderRepository.findByCustomerIdAndIdempotencyKey(customer.id(), ATTEMPT_ID)).thenReturn(Optional.of(order));

        assertThat(place(request).total()).isEqualByComparingTo("600");
        assertThat(rice.getQuantity()).isZero();
        verify(productRepository).findByIdForUpdate(1L);
        verify(productRepository).save(rice);

        var changed = request(PaymentMethod.COD, manualAddress(), new PlaceOrderRequest.Line(1L, 5));
        assertThatThrownBy(() -> place(changed))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("different order details");
    }

    @Test
    void orderDetailsAreScopedToTheCustomer() {
        assertThatThrownBy(() -> service.findMine(customer, 99L))
                .isInstanceOf(com.mrnpe.one.exception.ResourceNotFoundException.class);
        verify(orderRepository).findByIdAndCustomerId(99L, customer.id());
    }

    @Test
    void rejectsProductsFromDifferentFarmsWithoutReservingStock() {
        Product rice = product(1L, "Rice", "100", 50);
        Product tomatoes = product(2L, "Tomatoes", "100", 50);
        tomatoes.setFarmerId(2L);
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(rice));
        when(productRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(tomatoes));

        assertThatThrownBy(() -> place(request(PaymentMethod.COD, manualAddress(),
                new PlaceOrderRequest.Line(1L, 3), new PlaceOrderRequest.Line(2L, 3))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("products from one farm");

        assertThat(rice.getQuantity()).isEqualTo(50);
        assertThat(tomatoes.getQuantity()).isEqualTo(50);
        verify(productRepository, never()).save(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void quotesTheNextConfiguredDeliveryDayAndShowsAvailableStock() {
        Product rice = product(1L, "Rice", "100", 50);
        when(productRepository.findById(1L)).thenReturn(Optional.of(rice));
        userRepository.findById(1L).orElseThrow().setDeliveryDays("MON");

        var quote = service.quote(request(PaymentMethod.COD, manualAddress(), new PlaceOrderRequest.Line(1L, 6)));

        assertThat(quote.deliveryDate()).isEqualTo(LocalDate.now(ZoneId.of("Asia/Kolkata"))
                .with(TemporalAdjusters.next(DayOfWeek.MONDAY)));
        assertThat(quote.items().get(0).availableStock()).isEqualTo(50);
        assertThat(quote.total()).isEqualByComparingTo("600");
        verify(productRepository, never()).save(any());
    }

    @Test
    void rejectsAnAddressOutsideTheFarmRadius() {
        Product rice = product(1L, "Rice", "100", 50);
        when(productRepository.findById(1L)).thenReturn(Optional.of(rice));
        var farAddress = new PlaceOrderRequest.Address(AddressMode.CURRENT_LOCATION,
                "Other place", null, null, null, null, 17.4, 78.5, "Anita", "+919000000003", null);

        assertThatThrownBy(() -> service.quote(request(PaymentMethod.COD, farAddress,
                new PlaceOrderRequest.Line(1L, 6))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("outside the farm");
        assertThat(rice.getQuantity()).isEqualTo(50);
        verify(productRepository, never()).save(any());
    }

    @Test
    void stalePriceRequiresAnotherReviewBeforeStockChanges() {
        Product rice = product(1L, "Rice", "100", 50);
        when(productRepository.findById(1L)).thenReturn(Optional.of(rice));
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(rice));
        var request = reviewed(request(PaymentMethod.COD, manualAddress(), new PlaceOrderRequest.Line(1L, 6)));
        rice.setPrice(new BigDecimal("125"));

        assertThatThrownBy(() -> place(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("review the current quote");
        assertThat(rice.getQuantity()).isEqualTo(50);
        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsFewerThanMinimumItems() {
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product(1L, "Rice", "200", 50)));

        assertThatThrownBy(() -> place(request(PaymentMethod.COD, manualAddress(),
                new PlaceOrderRequest.Line(1L, 4))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Minimum order is 5 items");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsCartBelowMinimumValue() {
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product(1L, "Eggs", "8", 200)));

        assertThatThrownBy(() -> place(request(PaymentMethod.COD, manualAddress(),
                new PlaceOrderRequest.Line(1L, 10))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Minimum cart value is ₹500");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsWhenStockIsInsufficient() {
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(product(1L, "Chillies", "60", 3)));

        assertThatThrownBy(() -> place(request(PaymentMethod.COD, manualAddress(),
                new PlaceOrderRequest.Line(1L, 10))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only 3 kg of \"Chillies\" left");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsDisabledPaymentMethodsBeforeTouchingStock() {
        assertThatThrownBy(() -> place(request(PaymentMethod.UPI, manualAddress(),
                new PlaceOrderRequest.Line(1L, 10))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not available yet");

        verify(productRepository, never()).findByIdForUpdate(anyLong());
    }

    @Test
    void currentLocationAddressRequiresCoordinates() {
        PlaceOrderRequest.Address noCoords = new PlaceOrderRequest.Address(AddressMode.CURRENT_LOCATION,
                "Guntur", null, null, null, null, null, null, "Anita", "+919000000003", null);

        assertThatThrownBy(() -> place(request(PaymentMethod.COD, noCoords,
                new PlaceOrderRequest.Line(1L, 10))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("device coordinates");
    }

    @Test
    void mergesDuplicateLinesForTheSameProduct() {
        Product rice = product(1L, "Rice", "100", 50);
        when(productRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(rice));
        when(productRepository.findById(1L)).thenReturn(Optional.of(rice));

        OrderResponse response = place(reviewed(request(PaymentMethod.COD, manualAddress(),
                new PlaceOrderRequest.Line(1L, 3),
                new PlaceOrderRequest.Line(1L, 2))));

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).quantity()).isEqualTo(5);
        assertThat(rice.getQuantity()).isEqualTo(45);
    }
}
