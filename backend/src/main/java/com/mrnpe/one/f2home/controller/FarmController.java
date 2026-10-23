package com.mrnpe.one.f2home.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.dto.FarmHistoryResponse;
import com.mrnpe.one.f2home.dto.FarmProfileRequest;
import com.mrnpe.one.f2home.dto.FarmProfileResponse;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.FarmHistoryService;
import com.mrnpe.one.f2home.service.FarmProfileService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/f2home/farm")
public class FarmController {

    private final FarmHistoryService farmHistoryService;
    private final FarmProfileService farmProfileService;

    public FarmController(FarmHistoryService farmHistoryService, FarmProfileService farmProfileService) {
        this.farmHistoryService = farmHistoryService;
        this.farmProfileService = farmProfileService;
    }

    /** The signed-in farmer's full product history (active, expired, deleted) with sales. */
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN')")
    public ResponseEntity<FarmHistoryResponse> history(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(farmHistoryService.history(user));
    }

    /** The signed-in farmer's farm pin and delivery reach (days + radius). */
    @GetMapping("/profile")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<FarmProfileResponse> profile(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(farmProfileService.get(user));
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<FarmProfileResponse> updateProfile(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @RequestBody @Valid FarmProfileRequest request) {
        return ResponseEntity.ok(farmProfileService.update(user, request));
    }
}
