package com.mrnpe.one.f2home.dto;

import java.time.Instant;
import com.mrnpe.one.f2home.entity.OrderItemReport;

public record ItemReportResponse(Long id, Long itemId, String itemName, OrderItemReport.Kind kind,
        String details, Instant createdAt, Instant resolvedAt, String resolution, Long adminId, String adminName) {
    public static ItemReportResponse from(OrderItemReport report, boolean admin) {
        return new ItemReportResponse(report.getId(), report.getItemId(), report.getItemName(),
                report.getKind(), report.getDetails(), report.getCreatedAt(), report.getResolvedAt(),
                report.getResolution(), admin ? report.getAdminId() : null, admin ? report.getAdminName() : null);
    }
}
