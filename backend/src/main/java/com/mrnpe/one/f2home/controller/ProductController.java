package com.mrnpe.one.f2home.controller;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.MessageResponse;
import com.mrnpe.one.f2home.dto.ProductRequest;
import com.mrnpe.one.f2home.dto.ProductResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.ProductMedia;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.ProductService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/f2home/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    // ================= BROWSE =================
    //
    // Customers must pass their location and get only listings within the
    // configured radius. Farmers/admins may omit it and see everything.
    // `ids` fetches specific listings (used by the cart page).
    @GetMapping
    public ResponseEntity<List<ProductResponse>> list(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            return ResponseEntity.ok(productService.findByIds(ids));
        }
        if (lat != null && lng != null) {
            return ResponseEntity.ok(productService.findNearby(lat, lng, category));
        }
        if (user.role() == F2HomeRole.CUSTOMER) {
            throw new BadRequestException("Set your location (lat, lng) to see nearby produce.");
        }
        return ResponseEntity.ok(productService.findAll(category));
    }

    // ================= MY LISTINGS (FARMER) =================
    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN')")
    public ResponseEntity<List<ProductResponse>> mine(@AuthenticationPrincipal F2HomeUserPrincipal user) {
        return ResponseEntity.ok(productService.findMine(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(productService.get(id));
    }

    // ================= MEDIA (public, unguessable UUID) =================
    //
    // <img>/<video> tags cannot send an Authorization header, so this
    // endpoint is permitted without a token in the security chain. Media ids
    // are random UUIDs, and a listing's photos are public by nature.
    @GetMapping("/{id}/media/{mediaId}")
    public ResponseEntity<byte[]> media(@PathVariable Long id, @PathVariable UUID mediaId) {
        ProductMedia m = productService.getMedia(id, mediaId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(m.getContentType()))
                .contentLength(m.getSizeBytes())
                // Immutable: a media row is never edited, only replaced with a new id.
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .body(m.getData());
    }

    // ================= CREATE / UPDATE / DELETE (FARMER) =================
    //
    // multipart/form-data: "product" (JSON), "images" (0..n files), "video" (0..1).
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN')")
    public ResponseEntity<ProductResponse> create(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @RequestPart("product") @Valid ProductRequest product,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestPart(value = "video", required = false) MultipartFile video) {
        return ResponseEntity.ok(productService.create(user, product, images, video));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN')")
    public ResponseEntity<ProductResponse> update(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @PathVariable Long id,
            @RequestPart("product") @Valid ProductRequest product,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestPart(value = "video", required = false) MultipartFile video) {
        return ResponseEntity.ok(productService.update(user, id, product, images, video));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN')")
    public ResponseEntity<MessageResponse> delete(
            @AuthenticationPrincipal F2HomeUserPrincipal user,
            @PathVariable Long id) {
        productService.delete(user, id);
        return ResponseEntity.ok(new MessageResponse("Product removed."));
    }
}
