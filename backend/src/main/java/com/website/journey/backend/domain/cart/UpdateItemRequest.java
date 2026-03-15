package com.website.journey.backend.domain.cart;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateItemRequest(
        @NotNull @Min(0) Integer quantity
) {
}
