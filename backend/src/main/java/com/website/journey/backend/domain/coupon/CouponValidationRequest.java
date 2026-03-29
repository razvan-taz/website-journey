package com.website.journey.backend.domain.coupon;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record CouponValidationRequest(
        @NotBlank String code,
        @NotNull List<CartItemDto> cartItems
) {
    public record CartItemDto(
            Long productId,
            String category,
            Integer quantity,
            BigDecimal unitPrice
    ) {}
}
