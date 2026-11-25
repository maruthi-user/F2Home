package com.mrnpe.one.f2home.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.CheckoutQuote;
import com.mrnpe.one.f2home.dto.MarketplaceRulesResponse;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.OrderService;
import com.mrnpe.one.f2home.service.OrderDecisionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/f2home")
public class OrderController {

    private final OrderService orderService;

    private final OrderDecisionService decisions;

    public OrderController(OrderService orderService, OrderDecisionService decisions) {
        this.orderService = orderService;
        this.decisions = decisions;
    }

    // ================= RULES (radius, minimums, payment methods) =================
    @GetMapping("/marketplace/rules")
    public ResponseEntity<MarketplaceRulesResponse> rules() {
        return ResponseEntity.ok(orderService.rules());
    }

    // ================= CHECKOUT (CUSTOMER) =================
    @PostMapping("/orders/quote")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CheckoutQuote> quote(@RequestBody @Valid PlaceOrderRequest request) {
        return ResponseEntity.ok(orderService.quote(request));
    }

    @PostMapping("/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> place(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @RequestHeader(value = "Idempotency-Key", required = false) UUID attemptId,
            @RequestBody @Valid PlaceOrderRequest request) {
        return ResponseEntity.ok(orderService.place(user, request, attemptId));
    }

    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> cancel(
            @AuthenticationPrincipal F2HomeUserPrincipal user, @PathVariable Long id) {
        return ResponseEntity.ok(decisions.cancel(user.id(), id));
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderResponse> order(
            @AuthenticationPrincipal F2HomeUserPrincipal user, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.findMine(user, id));
    }

    // ================= MY ORDERS (CUSTOMER) =================
    @GetMapping("/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderResponse>> mine(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(orderService.findMine(user));
    }
}
