package com.mrnpe.one.f2home.controller;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest.Address;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.ReorderService;
import com.mrnpe.one.f2home.service.SavedAddressService;
import com.mrnpe.one.f2home.service.SavedAddressService.SavedAddress;

@RestController
@RequestMapping("/api/f2home/orders")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerShoppingController {
    private final SavedAddressService addresses;
    private final ReorderService reorder;

    public CustomerShoppingController(SavedAddressService addresses, ReorderService reorder) {
        this.addresses = addresses;
        this.reorder = reorder;
    }

    public record SaveAddressRequest(@NotBlank @Size(max = 60) String name, @NotNull @Valid Address address) {}

    @GetMapping("/addresses")
    public List<SavedAddress> addresses(@AuthenticationPrincipal F2HomeUserPrincipal customer) {
        return addresses.list(customer.id());
    }

    @PostMapping("/addresses")
    public SavedAddress save(@AuthenticationPrincipal F2HomeUserPrincipal customer, @Valid @RequestBody SaveAddressRequest request) {
        return addresses.save(customer.id(), request.name(), request.address());
    }

    @DeleteMapping("/addresses/{addressId}")
    public void delete(@AuthenticationPrincipal F2HomeUserPrincipal customer, @PathVariable Long addressId) {
        addresses.delete(customer.id(), addressId);
    }

    @GetMapping("/{id}/reorder")
    public ReorderService.Preview preview(@AuthenticationPrincipal F2HomeUserPrincipal customer,
            @PathVariable Long id, @RequestParam(required = false) Long addressId) {
        return reorder.preview(customer.id(), id, addressId);
    }
}
