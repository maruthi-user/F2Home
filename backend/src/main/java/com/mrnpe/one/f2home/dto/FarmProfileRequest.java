package com.mrnpe.one.f2home.dto;

import java.util.List;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Sets a farmer's farm pin and delivery reach. The upper bound on
 * {@code deliveryRadiusKm} is the platform's configured max (see
 * FarmProfileService) - a farmer can deliver less far than that, never more.
 */
public record FarmProfileRequest(
        @NotNull @Min(-90) @Max(90) Double lat,
        @NotNull @Min(-180) @Max(180) Double lng,
        @NotBlank(message = "A name for your farm's location is required") @Size(max = 255) String locationLabel,
        @NotNull @DecimalMin(value = "1.0", message = "Delivery radius must be at least 1 km")
        @DecimalMax(value = "100.0", message = "Delivery radius cannot exceed 100 km")
        Double deliveryRadiusKm,
        @NotEmpty(message = "Choose at least one delivery day") List<String> deliveryDays
) {
}
