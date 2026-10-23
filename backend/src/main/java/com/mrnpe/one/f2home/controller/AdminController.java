package com.mrnpe.one.f2home.controller;

import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.PendingFarmerResponse;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.service.AdminFarmerService;

/**
 * Admin-only endpoints. {@code /api/f2home/admin/**} is restricted to
 * ROLE_ADMIN in {@code F2HomeSecurityConfiguration}; admin accounts are
 * created directly in the database (see backend/scripts/create-user.sql) -
 * they cannot self-register.
 */
@RestController
@RequestMapping("/api/f2home/admin/farmers")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminFarmerService farmerService;

    public AdminController(AdminFarmerService farmerService) {
        this.farmerService = farmerService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<PendingFarmerResponse>> pending() {
        return ResponseEntity.ok(farmerService.pending());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PendingFarmerResponse> approve(@PathVariable Long id) {
        return ResponseEntity.ok(farmerService.approve(id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<PendingFarmerResponse> reject(@PathVariable Long id) {
        return ResponseEntity.ok(farmerService.reject(id));
    }

    @PostMapping("/{id}/reinstate")
    public ResponseEntity<PendingFarmerResponse> reinstate(@PathVariable Long id) {
        return ResponseEntity.ok(farmerService.reinstate(id));
    }

    /** The farmer's self-taken registration photo, for the admin to review. */
    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> photo(@PathVariable Long id) {
        F2HomeUser farmer = farmerService.getFarmer(id);
        if (farmer.getPhotoBytes() == null || farmer.getPhotoBytes().length == 0) {
            throw new ResourceNotFoundException("No photo on file for this farmer.");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(farmer.getPhotoContentType()))
                .contentLength(farmer.getPhotoBytes().length)
                .cacheControl(CacheControl.noStore())
                .body(farmer.getPhotoBytes());
    }
}
