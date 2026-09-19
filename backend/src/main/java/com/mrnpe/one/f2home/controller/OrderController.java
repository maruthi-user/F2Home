package com.mrnpe.one.f2home.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.MarketplaceRulesResponse;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.OrderService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/f2home")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // ================= RULES (radius, minimums, payment methods) =================
    @GetMapping("/marketplace/rules")
    public ResponseEntity<MarketplaceRulesResponse> rules() {
        return ResponseEntity.ok(orderService.rules());
    }

    // ================= CHECKOUT (CUSTOMER) =================
    @PostMapping("/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> place(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @RequestBody @Valid PlaceOrderRequest request) {
        return ResponseEntity.ok(orderService.place(user, request));
    }

    // ================= MY ORDERS (CUSTOMER) =================
    @GetMapping("/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderResponse>> mine(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(orderService.findMine(user));
    }
}
