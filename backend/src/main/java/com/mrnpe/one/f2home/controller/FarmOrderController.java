package com.mrnpe.one.f2home.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.FarmOrderRow;
import com.mrnpe.one.f2home.dto.FulfillmentRequest;
import com.mrnpe.one.f2home.dto.OrderResponse;
import com.mrnpe.one.f2home.service.OrderDecisionService;
import com.mrnpe.one.f2home.service.OrderFulfillmentService;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.FarmOrderService;

/** Orders for the signed-in farmer's products, and accept / reject. */
@RestController
@RequestMapping("/api/f2home/farm/orders")
@PreAuthorize("hasRole('FARMER')")
public class FarmOrderController {

    private final FarmOrderService service;

    private final OrderDecisionService decisions;

    private final OrderFulfillmentService fulfillment;

    public FarmOrderController(FarmOrderService service, OrderDecisionService decisions, OrderFulfillmentService fulfillment) {
        this.service = service;
        this.decisions = decisions;
        this.fulfillment = fulfillment;
    }

    @GetMapping
    public ResponseEntity<List<FarmOrderRow>> list(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(service.list(user));
    }

    @PostMapping("/{orderId}/accept-order")
    public ResponseEntity<OrderResponse> acceptOrder(@AuthenticationPrincipal F2HomeUserPrincipal user,
                                                      @PathVariable Long orderId) {
        return ResponseEntity.ok(decisions.decide(user.id(), orderId, true));
    }

    @PostMapping("/{orderId}/reject-order")
    public ResponseEntity<OrderResponse> rejectOrder(@AuthenticationPrincipal F2HomeUserPrincipal user,
                                                      @PathVariable Long orderId) {
        return ResponseEntity.ok(decisions.decide(user.id(), orderId, false));
    }

    @PostMapping("/{orderId}/fulfillment")
    public ResponseEntity<OrderResponse> fulfill(@AuthenticationPrincipal F2HomeUserPrincipal user,
            @PathVariable Long orderId, @RequestBody @Valid FulfillmentRequest request) {
        return ResponseEntity.ok(fulfillment.update(user.id(), orderId, request));
    }

    @PostMapping("/{itemId}/accept")
    public ResponseEntity<FarmOrderRow> accept(@AuthenticationPrincipal F2HomeUserPrincipal user,
                                               @PathVariable Long itemId) {
        return ResponseEntity.ok(service.decide(user, itemId, true));
    }

    @PostMapping("/{itemId}/reject")
    public ResponseEntity<FarmOrderRow> reject(@AuthenticationPrincipal F2HomeUserPrincipal user,
                                               @PathVariable Long itemId) {
        return ResponseEntity.ok(service.decide(user, itemId, false));
    }
}
