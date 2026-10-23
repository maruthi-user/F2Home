package com.mrnpe.one.f2home.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.FarmOrderRow;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.FarmOrderService;

/** Orders for the signed-in farmer's products, and accept / reject. */
@RestController
@RequestMapping("/api/f2home/farm/orders")
@PreAuthorize("hasRole('FARMER')")
public class FarmOrderController {

    private final FarmOrderService service;

    public FarmOrderController(FarmOrderService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<FarmOrderRow>> list(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(service.list(user));
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
