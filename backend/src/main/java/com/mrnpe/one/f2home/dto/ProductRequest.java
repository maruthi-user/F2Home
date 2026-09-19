package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The JSON part of a multipart create/update product request (the files
 * travel as separate "images" / "video" parts).
 *
 * @param keepMediaIds on update: ids of existing media to retain; anything
 *                     not listed is deleted. Ignored on create.
 */
public record ProductRequest(

        @NotBlank(message = "Product name is required")
        @Size(max = 150, message = "Product name must be at most 150 characters")
        String name,

        @NotBlank(message = "Category is required")
        @Size(max = 50)
        String category,

        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than 0")
        BigDecimal price,

        @NotBlank(message = "Unit is required")
        @Size(max = 20)
        String unit,

        @NotNull(message = "Quantity is required")
        @Min(value = 0, message = "Quantity cannot be negative")
        Integer quantity,

        @NotNull(message = "Product location is required")
        @Valid
        LocationDto location,

        List<UUID> keepMediaIds
) {
    public record LocationDto(
            @NotNull @Min(-90) @Max(90) Double lat,
            @NotNull @Min(-180) @Max(180) Double lng,
            @NotBlank(message = "Location name is required") @Size(max = 255) String label
    ) {
    }
}
