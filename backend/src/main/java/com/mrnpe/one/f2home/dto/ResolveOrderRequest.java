package com.mrnpe.one.f2home.dto;

import com.mrnpe.one.f2home.entity.OrderResolution.Action;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ResolveOrderRequest(@NotNull Action action, @NotBlank @Size(max = 500) String reason) {}
