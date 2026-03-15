package com.website.journey.backend.domain.cart;

import java.math.BigDecimal;

public record CartItemResponse(Long productId, String name, BigDecimal price, String imageUrl, Integer quantity) {
}
