package com.mrnpe.one.f2home.controller;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.mrnpe.one.f2home.dto.ItemReportResponse;
import com.mrnpe.one.f2home.entity.OrderItemReport;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.OrderSupportService;

@RestController
@RequestMapping("/api/f2home")
public class OrderSupportController {
    private final OrderSupportService support;

    public OrderSupportController(OrderSupportService support) { this.support = support; }

    public record ReportRequest(@NotNull Long itemId, @NotNull OrderItemReport.Kind kind,
                                @NotBlank @Size(max = 500) String details) {}
    public record ResolutionRequest(@NotBlank @Size(max = 500) String resolution) {}

    @GetMapping("/orders/{id}/reports")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<ItemReportResponse> customerReports(@AuthenticationPrincipal F2HomeUserPrincipal user, @PathVariable Long id) {
        return support.customerReports(user.id(), id);
    }

    @PostMapping("/orders/{id}/reports")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ItemReportResponse report(@AuthenticationPrincipal F2HomeUserPrincipal user, @PathVariable Long id,
                                     @Valid @RequestBody ReportRequest request) {
        return support.report(user.id(), id, request.itemId(), request.kind(), request.details());
    }

    @GetMapping("/admin/orders/{id}/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ItemReportResponse> adminReports(@PathVariable Long id) {
        return support.adminReports(id);
    }

    @PostMapping("/admin/orders/{id}/reports/{reportId}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ItemReportResponse resolve(@AuthenticationPrincipal F2HomeUserPrincipal admin, @PathVariable Long id,
                                      @PathVariable Long reportId, @Valid @RequestBody ResolutionRequest request) {
        return support.resolve(admin, id, reportId, request.resolution());
    }
}
