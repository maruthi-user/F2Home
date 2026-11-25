package com.mrnpe.one.f2home.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.ItemReportResponse;
import com.mrnpe.one.f2home.entity.*;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.OrderItemReportRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@Service
public class OrderSupportService {
    private final MarketplaceOrderRepository orders;
    private final OrderItemReportRepository reports;

    public OrderSupportService(MarketplaceOrderRepository orders, OrderItemReportRepository reports) {
        this.orders = orders;
        this.reports = reports;
    }

    @Transactional(readOnly = true)
    public List<ItemReportResponse> customerReports(Long customerId, Long orderId) {
        orders.findByIdAndCustomerId(orderId, customerId).orElseThrow(OrderSupportService::notFound);
        return list(orderId, false);
    }

    @Transactional(readOnly = true)
    public List<ItemReportResponse> adminReports(Long orderId) {
        if (!orders.existsById(orderId)) throw notFound();
        return list(orderId, true);
    }

    @Transactional
    public ItemReportResponse report(Long customerId, Long orderId, Long itemId, OrderItemReport.Kind kind, String details) {
        MarketplaceOrder order = lock(orderId);
        if (!customerId.equals(order.getCustomerId())) throw notFound();
        if (order.getStatus() != OrderStatus.DELIVERED) throw new BadRequestException("Reports are available after delivery.");
        OrderItem item = order.getItems().stream().filter(line -> itemId.equals(line.getId())
                && line.getStatus() != OrderItemStatus.REJECTED).findFirst().orElseThrow(OrderSupportService::notFound);
        if (reports.existsByItemIdAndResolvedAtIsNull(itemId)) {
            throw new IllegalStateException("This item already has an open report.");
        }
        return ItemReportResponse.from(reports.save(new OrderItemReport(orderId, item, kind, details.strip())), false);
    }

    @Transactional
    public ItemReportResponse resolve(F2HomeUserPrincipal admin, Long orderId, Long reportId, String resolution) {
        lock(orderId);
        OrderItemReport report = reports.findById(reportId).filter(value -> orderId.equals(value.getOrderId()))
                .orElseThrow(OrderSupportService::notFound);
        if (report.getResolvedAt() != null) throw new IllegalStateException("This report has already been resolved.");
        report.resolve(admin.id(), admin.fullName(), resolution.strip());
        return ItemReportResponse.from(report, true);
    }

    private List<ItemReportResponse> list(Long orderId, boolean admin) {
        return reports.findByOrderIdOrderByIdDesc(orderId).stream()
                .map(report -> ItemReportResponse.from(report, admin)).toList();
    }

    private MarketplaceOrder lock(Long orderId) {
        return orders.findByIdForUpdate(orderId).orElseThrow(OrderSupportService::notFound);
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Order or item report not found.");
    }
}
