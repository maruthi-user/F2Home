package com.mrnpe.one.f2home.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.AdminOrderResponse;
import com.mrnpe.one.f2home.dto.ResolveOrderRequest;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.AdminOrderService;
import com.mrnpe.one.f2home.service.AdminOrderService.Filter;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/f2home/admin/orders")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOrderController {
    private final AdminOrderService orders;

    public AdminOrderController(AdminOrderService orders) {
        this.orders = orders;
    }

    @GetMapping
    public AdminOrderResponse.Results lookup(@RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "ALL") Filter filter, @RequestParam(defaultValue = "0") int page) {
        return orders.lookup(q, filter, page);
    }

    @GetMapping("/{id}")
    public AdminOrderResponse detail(@PathVariable Long id) {
        return orders.detail(id);
    }

    @PostMapping("/{id}/resolve")
    public AdminOrderResponse resolve(@AuthenticationPrincipal F2HomeUserPrincipal admin,
            @PathVariable Long id, @RequestBody @Valid ResolveOrderRequest request) {
        return orders.resolve(admin, id, request);
    }
}
