package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest.Address;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderItemStatus;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;

@Service
public class ReorderService {
    private final MarketplaceOrderRepository orders;
    private final ProductRepository products;
    private final SavedAddressService addresses;
    private final OrderService checkout;

    public record Line(Long itemId, Long productId, String name, String unit, int requested,
                       int inStock, int available, BigDecimal previousPrice, BigDecimal currentPrice) {}
    public record Farm(Long farmerId, String name, LocalDate deliveryDate, String deliveryError, List<Line> items) {}
    public record Preview(Address address, List<Farm> farms) {}

    public ReorderService(MarketplaceOrderRepository orders, ProductRepository products,
                          SavedAddressService addresses, OrderService checkout) {
        this.orders = orders;
        this.products = products;
        this.addresses = addresses;
        this.checkout = checkout;
    }

    @Transactional(readOnly = true)
    public Preview preview(Long customerId, Long orderId, Long addressId) {
        var order = orders.findByIdAndCustomerId(orderId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        var address = addressId == null
                ? new Address(order.getAddressMode(), order.getAddressLabel(), order.getAddressLine1(),
                        order.getAddressLandmark(), order.getAddressCity(), order.getAddressPincode(),
                        order.getAddressLat(), order.getAddressLng(), order.getContactName(), order.getContactPhone(), null)
                : addresses.find(customerId, addressId);

        Map<Long, List<OrderItem>> farms = new LinkedHashMap<>();
        Map<Long, Integer> remaining = new LinkedHashMap<>();
        List<OrderItem> lines = order.getItems().stream().filter(item -> item.getStatus() != OrderItemStatus.REJECTED).toList();
        var ids = lines.stream().map(OrderItem::getProductId).filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, Product> current = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        for (Product product : products.findAllById(ids)) {
            if (product.getStatus() == ProductStatus.ACTIVE
                    && (product.getExpiresAt() == null || product.getExpiresAt().isAfter(now))) {
                current.put(product.getId(), product);
                remaining.put(product.getId(), product.getQuantity());
            }
        }
        for (OrderItem line : lines) {
            farms.computeIfAbsent(line.getFarmerId(), ignored -> new java.util.ArrayList<>()).add(line);
        }
        return new Preview(address, farms.entrySet().stream()
                .map(entry -> farm(entry.getKey(), entry.getValue(), address, current, remaining)).toList());
    }

    private Farm farm(Long farmerId, List<OrderItem> items, Address address,
                      Map<Long, Product> current, Map<Long, Integer> remaining) {
        LocalDate date = null;
        String error = null;
        if (!SavedAddressService.hasCoordinates(address)) {
            error = "This address has no confirmed location. Choose a saved delivery address.";
        } else {
            try {
                date = checkout.deliveryDate(farmerId, address);
            } catch (BadRequestException e) {
                error = e.getMessage();
            }
        }
        List<Line> lines = items.stream().map(item -> {
            Product product = current.get(item.getProductId());
            if (product == null || !farmerId.equals(product.getFarmerId()) || !item.getUnit().equals(product.getUnit())) {
                return new Line(item.getId(), item.getProductId(), item.getProductName(), item.getUnit(),
                        item.getQuantity(), 0, 0, item.getUnitPrice(), null);
            }
            int available = Math.min(item.getQuantity(), remaining.get(product.getId()));
            remaining.merge(product.getId(), -available, Integer::sum);
            return new Line(item.getId(), product.getId(), product.getName(), product.getUnit(),
                    item.getQuantity(), product.getQuantity(), available, item.getUnitPrice(), product.getPrice());
        }).toList();
        return new Farm(farmerId, items.get(0).getFarmerName(), date, error, lines);
    }
}
