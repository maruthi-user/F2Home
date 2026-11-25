package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.CheckoutQuote;
import com.mrnpe.one.f2home.dto.MarketplaceRulesResponse;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest;
import com.mrnpe.one.f2home.entity.AddressMode;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.PaymentMethod;
import com.mrnpe.one.f2home.entity.PaymentStatus;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductMediaType;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
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
    private final F2HomeUserRepository userRepository;
    private final ObjectMapper objectMapper;

    public OrderService(MarketplaceOrderRepository orderRepository,
                        ProductRepository productRepository,
                        ProductMediaRepository mediaRepository,
                        MarketplaceProperties props,
                        F2HomeUserRepository userRepository,
                        ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.mediaRepository = mediaRepository;
        this.props = props;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
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

    @Transactional(readOnly = true)
    public OrderResponse findMine(F2HomeUserPrincipal customer, Long id) {
        return orderRepository.findByIdAndCustomerId(id, customer.id())
                .map(OrderResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
    }

    private record PreparedCheckout(CheckoutQuote quote, Map<Long, Product> products) {}

    @Transactional(readOnly = true)
    public CheckoutQuote quote(PlaceOrderRequest request) {
        return prepare(request, false).quote();
    }

    @Transactional
    public OrderResponse place(F2HomeUserPrincipal customer, PlaceOrderRequest request, UUID attemptId) {
        if (attemptId == null) throw new BadRequestException("An idempotency key is required to place an order.");

        // Serialize checkout attempts for this customer until order and stock commit together.
        userRepository.lockForCheckout(customer.id())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));
        String fingerprint = fingerprint(request);
        var existing = orderRepository.findByCustomerIdAndIdempotencyKey(customer.id(), attemptId);
        if (existing.isPresent()) {
            MarketplaceOrder order = existing.get();
            if (!fingerprint.equals(order.getRequestFingerprint())) {
                throw new IllegalStateException("This checkout attempt was already used with different order details.");
            }
            return OrderResponse.from(order);
        }

        PreparedCheckout prepared = prepare(request, true);
        CheckoutQuote quote = prepared.quote();
        if (!quote.version().equals(request.quoteVersion())) {
            throw new BadRequestException("Check delivery again and review the current quote before placing your order.");
        }

        MarketplaceOrder order = new MarketplaceOrder();
        for (CheckoutQuote.Line line : quote.items()) {
            Product p = prepared.products().get(line.productId());
            p.setQuantity(p.getQuantity() - line.quantity());
            productRepository.save(p);

            OrderItem item = new OrderItem();
            item.setProductId(p.getId());
            item.setProductName(p.getName());
            item.setFarmerId(p.getFarmerId());
            item.setFarmerName(p.getFarmerName());
            item.setCategory(p.getCategory());
            item.setUnit(p.getUnit());
            item.setUnitPrice(line.unitPrice());
            item.setQuantity(line.quantity());
            item.setLineTotal(line.lineTotal());
            mediaRepository.findByProductIdOrderBySortOrderAsc(p.getId()).stream()
                    .filter(m -> m.getMediaType() == ProductMediaType.IMAGE)
                    .findFirst()
                    .ifPresent(m -> item.setThumbnailId(m.getId()));
            order.getItems().add(item);
        }

        PlaceOrderRequest.Address a = request.address();
        order.setCustomerId(customer.id());
        order.setIdempotencyKey(attemptId);
        order.setRequestFingerprint(fingerprint);
        order.setCustomerName(customer.fullName());
        order.setCustomerPhone(customer.phoneNumber());
        order.recordStatus(OrderStatus.PLACED, null);
        order.setResponseDeadline(Instant.now().plus(Math.max(1, props.getFarmerResponseMinutes()), ChronoUnit.MINUTES));
        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentStatus(PaymentStatus.PENDING); // COD: settled on delivery
        order.setItemCount(quote.items().stream().mapToInt(CheckoutQuote.Line::quantity).sum());
        order.setSubtotal(quote.subtotal());
        order.setDeliveryFee(quote.deliveryFee());
        order.setDeliveryDate(quote.deliveryDate());
        order.setTotal(quote.total());
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

    private PreparedCheckout prepare(PlaceOrderRequest request, boolean lockStock) {
        // ---- payment method ------------------------------------------------
        PaymentMethod method = request.paymentMethod();
        if (!method.isEnabled()) {
            throw new BadRequestException(method + " is not available yet. Please choose Cash on Delivery.");
        }

        // ---- address --------------------------------------------------------
        PlaceOrderRequest.Address a = request.address();
        if (a.mode() == AddressMode.MANUAL && (isBlank(a.line1()) || isBlank(a.city()) || isBlank(a.pincode()))) {
            throw new BadRequestException("Manual address needs street, town/city and a 6-digit PIN code.");
        }
        if (a.lat() == null || a.lng() == null || !Double.isFinite(a.lat()) || !Double.isFinite(a.lng())
                || Math.abs(a.lat()) > 90 || Math.abs(a.lng()) > 180) {
            throw new BadRequestException("Delivery needs the device coordinates or a located manual address.");
        }

        // ---- merge duplicate lines, lock products in ID order ---------------------
        Map<Long, Integer> wanted = new TreeMap<>();
        for (PlaceOrderRequest.Line line : request.items()) {
            try {
                wanted.merge(line.productId(), line.quantity(), Math::addExact);
            } catch (ArithmeticException e) {
                throw new BadRequestException("Requested quantity is too large.");
            }
        }

        // ---- reprice + check stock -------------------------------
        List<CheckoutQuote.Line> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        long itemCount = 0;
        Long farmerId = null;
        Map<Long, Product> products = new LinkedHashMap<>();

        for (Map.Entry<Long, Integer> e : wanted.entrySet()) {
            Long id = e.getKey();
            Product p = (lockStock ? productRepository.findByIdForUpdate(id) : productRepository.findById(id))
                    .filter(x -> x.getStatus() == ProductStatus.ACTIVE
                            && (x.getExpiresAt() == null || x.getExpiresAt().isAfter(java.time.LocalDateTime.now())))
                    .orElseThrow(() -> new BadRequestException("One of the products is no longer available."));
            if (p.getFarmerId() == null || (farmerId != null && !farmerId.equals(p.getFarmerId()))) {
                throw new BadRequestException("Each order must contain products from one farm.");
            }
            farmerId = p.getFarmerId();
            int qty = e.getValue();
            if (p.getQuantity() < qty) {
                throw new BadRequestException("Only " + p.getQuantity() + " " + p.getUnit() + " of \""
                        + p.getName() + "\" left - reduce the quantity.");
            }
            BigDecimal lineTotal = p.getPrice().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            lines.add(new CheckoutQuote.Line(id, p.getName(), p.getUnit(), qty, p.getQuantity(), p.getPrice(), lineTotal));
            products.put(id, p);
            subtotal = subtotal.add(lineTotal);
            itemCount += qty;
        }

        // ---- minimum order rules (server-side source of truth) -------------
        if (itemCount > Integer.MAX_VALUE) throw new BadRequestException("Requested quantity is too large.");
        if (itemCount < props.getMinOrderItems()) {
            throw new BadRequestException("Minimum order is " + props.getMinOrderItems()
                    + " items - you have " + itemCount + ".");
        }
        if (subtotal.compareTo(props.getMinOrderValue()) < 0) {
            throw new BadRequestException("Minimum cart value is ₹" + props.getMinOrderValue().stripTrailingZeros().toPlainString()
                    + " - your cart is ₹" + subtotal.setScale(2, RoundingMode.HALF_UP).toPlainString() + ".");
        }

        LocalDate date = deliveryDate(farmerId, a);
        BigDecimal fee = props.getDeliveryFee().setScale(2, RoundingMode.HALF_UP);
        String version = quoteVersion(request, lines, date, fee);
        return new PreparedCheckout(new CheckoutQuote(version, date, subtotal, fee, subtotal.add(fee), lines), products);
    }

    LocalDate deliveryDate(Long farmerId, PlaceOrderRequest.Address address) {
        var farm = userRepository.findById(farmerId)
                .filter(user -> user.getStatus() == F2HomeUserStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException("This farm is no longer taking orders."));
        double radius = farm.getDeliveryRadiusKm() == null ? props.getNearbyRadiusKm() : farm.getDeliveryRadiusKm();
        var delivery = FarmDelivery.check(farm.getFarmLat(), farm.getFarmLng(), farm.getDeliveryDays(),
                radius, address.lat(), address.lng(), FarmDelivery.today());
        if (delivery.reason() != null) throw new BadRequestException(delivery.reason());
        return delivery.date();
    }

    // The quote changes when any reviewed order detail changes. Stock is rechecked independently.
    private String quoteVersion(PlaceOrderRequest request, List<CheckoutQuote.Line> lines, LocalDate date, BigDecimal fee) {
        var prices = lines.stream()
                .map(line -> List.of(line.productId(), line.name(), line.unit(), line.quantity(), line.unitPrice().stripTrailingZeros()))
                .toList();
        return fingerprint(List.of(request.address(), request.paymentMethod(), prices, date.toString(), fee));
    }

    private String fingerprint(Object value) {
        try {
            byte[] data = objectMapper.writeValueAsBytes(value);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            throw new IllegalStateException("Could not fingerprint checkout data", e);
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String trim(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
