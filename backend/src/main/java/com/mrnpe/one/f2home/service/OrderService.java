package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.MarketplaceRulesResponse;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest;
import com.mrnpe.one.f2home.entity.AddressMode;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductMediaType;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductMediaRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

/**
 * Checkout. Everything the client cannot be trusted with is decided here:
 * prices come from the product rows, stock is checked under a row lock,
 * and the minimum-order rules are enforced before anything is written.
 */
@Service
public class OrderService {

    private final MarketplaceOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ProductMediaRepository mediaRepository;
    private final MarketplaceProperties props;

    public OrderService(MarketplaceOrderRepository orderRepository,
                        ProductRepository productRepository,
                        ProductMediaRepository mediaRepository,
                        MarketplaceProperties props) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.mediaRepository = mediaRepository;
        this.props = props;
    }

    public MarketplaceRulesResponse rules() {
        return new MarketplaceRulesResponse(
                props.getNearbyRadiusKm(),
                props.getMinOrderItems(),
                props.getMinOrderValue(),
                props.getMaxImageBytes(),
                props.getMaxImagesPerProduct(),
                props.getMaxVideoBytes(),
                List.of(PaymentMethod.values()).stream()
                        .map(m -> new MarketplaceRulesResponse.PaymentMethodInfo(m, m.isEnabled()))
                        .toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findMine(F2HomeUserPrincipal customer) {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(customer.id()).stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional
    public OrderResponse place(F2HomeUserPrincipal customer, PlaceOrderRequest request) {
        // ---- payment method ------------------------------------------------
        PaymentMethod method = request.paymentMethod();
        if (!method.isEnabled()) {
            throw new BadRequestException(method + " is not available yet. Please choose Cash on Delivery.");
        }

        // ---- address --------------------------------------------------------
        PlaceOrderRequest.Address a = request.address();
        if (a.mode() == AddressMode.CURRENT_LOCATION) {
            if (a.lat() == null || a.lng() == null) {
                throw new BadRequestException("Current-location delivery needs the device coordinates.");
            }
        } else {
            if (isBlank(a.line1()) || isBlank(a.city()) || isBlank(a.pincode())) {
                throw new BadRequestException("Manual address needs street, town/city and a 6-digit PIN code.");
            }
        }

        // ---- merge duplicate lines, keep request order ---------------------
        Map<Long, Integer> wanted = new LinkedHashMap<>();
        for (PlaceOrderRequest.Line line : request.items()) {
            wanted.merge(line.productId(), line.quantity(), Integer::sum);
        }

        // ---- reprice + lock + decrement stock -------------------------------
        MarketplaceOrder order = new MarketplaceOrder();
        BigDecimal subtotal = BigDecimal.ZERO;
        int itemCount = 0;

        for (Map.Entry<Long, Integer> e : wanted.entrySet()) {
            Product p = productRepository.findByIdForUpdate(e.getKey())
                    .filter(x -> x.getStatus() == ProductStatus.ACTIVE)
                    .orElseThrow(() -> new BadRequestException("One of the products is no longer available."));
            int qty = e.getValue();
            if (p.getQuantity() < qty) {
                throw new BadRequestException("Only " + p.getQuantity() + " " + p.getUnit() + " of \""
                        + p.getName() + "\" left - reduce the quantity.");
            }
            p.setQuantity(p.getQuantity() - qty);
            productRepository.save(p);

            OrderItem item = new OrderItem();
            item.setProductId(p.getId());
            item.setProductName(p.getName());
            item.setFarmerId(p.getFarmerId());
            item.setFarmerName(p.getFarmerName());
            item.setUnit(p.getUnit());
            item.setUnitPrice(p.getPrice());
            item.setQuantity(qty);
            item.setLineTotal(p.getPrice().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP));
            mediaRepository.findByProductIdOrderBySortOrderAsc(p.getId()).stream()
                    .filter(m -> m.getMediaType() == ProductMediaType.IMAGE)
                    .findFirst()
                    .ifPresent(m -> item.setThumbnailId(m.getId()));
            order.getItems().add(item);

            subtotal = subtotal.add(item.getLineTotal());
            itemCount += qty;
        }

        // ---- minimum order rules (server-side source of truth) -------------
        if (itemCount < props.getMinOrderItems()) {
            throw new BadRequestException("Minimum order is " + props.getMinOrderItems()
                    + " items - you have " + itemCount + ".");
        }
        if (subtotal.compareTo(props.getMinOrderValue()) < 0) {
            throw new BadRequestException("Minimum cart value is ₹" + props.getMinOrderValue().stripTrailingZeros().toPlainString()
                    + " - your cart is ₹" + subtotal.setScale(2, RoundingMode.HALF_UP).toPlainString() + ".");
        }

        // ---- write ----------------------------------------------------------
        order.setCustomerId(customer.id());
        order.setCustomerName(customer.fullName());
        order.setCustomerPhone(customer.phoneNumber());
        order.setStatus(OrderStatus.PLACED);
        order.setPaymentMethod(method);
        order.setPaymentStatus(PaymentStatus.PENDING); // COD: settled on delivery
        order.setItemCount(itemCount);
        order.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        order.setTotal(order.getSubtotal()); // extend here when delivery charges exist
        order.setAddressMode(a.mode());
        order.setAddressLabel(trim(a.label()));
        order.setAddressLine1(trim(a.line1()));
        order.setAddressLandmark(trim(a.landmark()));
        order.setAddressCity(trim(a.city()));
        order.setAddressPincode(trim(a.pincode()));
        order.setAddressLat(a.lat());
        order.setAddressLng(a.lng());
        order.setContactName(a.contactName().trim());
        order.setContactPhone(a.contactPhone().trim());
        order.setDeliveryNote(trim(a.note()));

        return OrderResponse.from(orderRepository.save(order));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String trim(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
