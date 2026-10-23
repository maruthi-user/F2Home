package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.mrnpe.one.f2home.entity.ProductStatus;

/**
 * "My Farm" history. {@code price} is the listing's current price;
 * {@code avgSalePrice} is what units actually sold for (null if none sold).
 */
public record FarmHistoryResponse(List<Row> items, Summary summary) {

    public record Row(
            Long id,
            String name,
            String category,
            String unit,
            BigDecimal price,
            int remainingQuantity,
            long soldQuantity,
            BigDecimal avgSalePrice,
            BigDecimal revenue,
            ProductStatus status,
            boolean perishable,
            LocalDate harvestDate,
            LocalDateTime addedAt,
            LocalDateTime expiresAt,
            LocalDateTime endedAt) {
    }

    public record Summary(
            long total,
            long active,
            long expired,
            long deleted,
            long unitsSold,
            BigDecimal totalRevenue) {
    }
}
