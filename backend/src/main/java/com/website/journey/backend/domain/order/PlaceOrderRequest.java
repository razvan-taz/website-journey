package com.website.journey.backend.domain.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record PlaceOrderRequest(
        @NotEmpty List<@Valid OrderItemRequest> items,
        @NotNull @Valid ShippingAddress shippingAddress,
        @NotNull @DecimalMin("0.01") BigDecimal total
) {
    public record OrderItemRequest(
            @NotNull Long productId,
            @NotBlank String name,
            @NotNull @DecimalMin("0.01") BigDecimal price,
            @NotNull @Min(1) Integer quantity
    ) {}

    public record ShippingAddress(
            @NotBlank String name,
            @NotBlank String line1,
            @NotBlank String city,
            @NotBlank String state,
            @NotBlank @Size(min = 3, max = 20) String zip,
            @NotBlank @Size(min = 2, max = 10) String country
    ) {}
}
