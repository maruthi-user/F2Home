package com.mrnpe.one.f2home.dto;

import java.util.List;

import com.mrnpe.one.f2home.entity.AddressMode;
import com.mrnpe.one.f2home.entity.PaymentMethod;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Checkout payload. Prices are NOT accepted from the client - every line is
 * repriced from the current product row inside the order transaction.
 */
public record PlaceOrderRequest(

        @NotEmpty(message = "The cart is empty")
        @Valid
        List<Line> items,

        @NotNull(message = "Delivery address is required")
        @Valid
        Address address,

        @NotNull(message = "Payment method is required")
        PaymentMethod paymentMethod
) {
    public record Line(
            @NotNull(message = "Product is required") Long productId,
            @NotNull @Min(value = 1, message = "Quantity must be at least 1") Integer quantity
    ) {
    }

    public record Address(
            @NotNull(message = "Address mode is required") AddressMode mode,
            @Size(max = 255) String label,
            @Size(max = 255) String line1,
            @Size(max = 255) String landmark,
            @Size(max = 100) String city,
            @Pattern(regexp = "^$|^\\d{6}$", message = "PIN code must be 6 digits") String pincode,
            @Min(-90) @Max(90) Double lat,
            @Min(-180) @Max(180) Double lng,
            @NotBlank(message = "Receiver name is required") @Size(max = 255) String contactName,
            @NotBlank(message = "Contact phone is required") @Size(max = 20) String contactPhone,
            @Size(max = 500) String note
    ) {
    }
}
