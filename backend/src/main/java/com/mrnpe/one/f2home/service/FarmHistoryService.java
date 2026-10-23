package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.f2home.dto.FarmHistoryResponse;
import com.mrnpe.one.f2home.dto.FarmHistoryResponse.Row;
import com.mrnpe.one.f2home.dto.FarmHistoryResponse.Summary;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository.SoldRow;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

/** "My Farm": every listing the farmer ever added, with sales, in every status. */
@Service
public class FarmHistoryService {

    private final ProductRepository productRepository;
    private final MarketplaceOrderRepository orderRepository;

    public FarmHistoryService(ProductRepository productRepository, MarketplaceOrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public FarmHistoryResponse history(F2HomeUserPrincipal farmer) {
        Map<Long, SoldRow> sold = orderRepository.soldByProduct(farmer.id()).stream()
                .collect(Collectors.toMap(SoldRow::getProductId, Function.identity()));
        LocalDateTime now = LocalDateTime.now();

        List<Row> rows = productRepository.findByFarmerIdOrderByCreatedAtDesc(farmer.id()).stream()
                .map(p -> toRow(p, sold.get(p.getId()), now))
                .toList();

        long active = rows.stream().filter(r -> r.status() == ProductStatus.ACTIVE).count();
        long expired = rows.stream().filter(r -> r.status() == ProductStatus.EXPIRED).count();
        long deleted = rows.stream().filter(r -> r.status() == ProductStatus.DELETED).count();
        long unitsSold = rows.stream().mapToLong(Row::soldQuantity).sum();
        BigDecimal revenue = rows.stream().map(Row::revenue).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new FarmHistoryResponse(rows, new Summary(rows.size(), active, expired, deleted, unitsSold, revenue));
    }

    private static Row toRow(Product p, SoldRow s, LocalDateTime now) {
        long qty = s == null ? 0 : s.getQuantity();
        BigDecimal revenue = s == null ? BigDecimal.ZERO : s.getRevenue().setScale(2, RoundingMode.HALF_UP);
        BigDecimal avg = qty == 0 ? null : revenue.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP);

        // Past expiry but not swept yet still reads as EXPIRED.
        ProductStatus status = p.getStatus();
        LocalDateTime endedAt = p.getEndedAt();
        if (status == ProductStatus.ACTIVE && p.getExpiresAt() != null && !p.getExpiresAt().isAfter(now)) {
            status = ProductStatus.EXPIRED;
            endedAt = p.getExpiresAt();
        }
        return new Row(p.getId(), p.getName(), p.getCategory(), p.getUnit(), p.getPrice(),
                p.getQuantity(), qty, avg, revenue, status, p.isPerishable(), p.getHarvestDate(),
                p.getCreatedAt(), p.getExpiresAt(), endedAt);
    }
}
