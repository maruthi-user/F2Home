package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;

import com.mrnpe.one.f2home.entity.OrderStatus;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record FulfillmentRequest(
        @NotNull OrderStatus status,
        @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal cashCollected,
        @Size(max = 300) String failureReason
) {}
