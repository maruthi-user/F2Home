package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.FarmOrderRow;
import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderItem;
import com.mrnpe.one.f2home.entity.OrderItemStatus;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

/**
 * Orders as the farmer sees them: only their own lines, each of which they
 * accept or reject. Rejecting gives the reserved stock back.
 */
@Service
public class FarmOrderService {

    private final MarketplaceOrderRepository orderRepository;
    private final ProductRepository productRepository;

    public FarmOrderService(MarketplaceOrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<FarmOrderRow> list(F2HomeUserPrincipal farmer) {
        return orderRepository.findLinesForFarmer(farmer.id()).stream()
                .map(r -> FarmOrderRow.of((MarketplaceOrder) r[0], (OrderItem) r[1]))
                .toList();
    }

    @Transactional
    public FarmOrderRow decide(F2HomeUserPrincipal farmer, Long itemId, boolean accept) {
        MarketplaceOrder order = orderRepository.findByItemId(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        OrderItem item = order.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Order not found."));
        if (!item.getFarmerId().equals(farmer.id())) {
            throw new AccessDeniedException("You can only respond to orders for your own products.");
        }
        if (item.getStatus() != OrderItemStatus.PENDING) {
            throw new BadRequestException("This order was already " + item.getStatus().name().toLowerCase() + ".");
        }

        item.setStatus(accept ? OrderItemStatus.ACCEPTED : OrderItemStatus.REJECTED);
        item.setDecidedAt(LocalDateTime.now());

        if (!accept && item.getProductId() != null) {
            productRepository.findByIdForUpdate(item.getProductId()).ifPresent(p -> {
                p.setQuantity(p.getQuantity() + item.getQuantity());
                productRepository.save(p);
            });
        }
        refreshOrder(order);
        orderRepository.save(order);
        return FarmOrderRow.of(order, item);
    }

    /** Totals count only non-rejected lines; the order status follows the lines. */
    private static void refreshOrder(MarketplaceOrder order) {
        List<OrderItem> kept = order.getItems().stream()
                .filter(i -> i.getStatus() != OrderItemStatus.REJECTED).toList();
        BigDecimal subtotal = kept.stream().map(OrderItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        order.setItemCount(kept.stream().mapToInt(OrderItem::getQuantity).sum());
        order.setSubtotal(subtotal);
        order.setTotal(subtotal);

        if (kept.isEmpty()) {
            order.setStatus(OrderStatus.CANCELLED);
        } else if (kept.stream().allMatch(i -> i.getStatus() == OrderItemStatus.ACCEPTED)) {
            order.setStatus(OrderStatus.CONFIRMED);
        }
    }
}
