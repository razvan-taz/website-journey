package com.website.journey.backend.domain.wishlist;

import java.math.BigDecimal;

public record WishlistResponse(
        Long productId,
        String name,
        String imageUrl,
        BigDecimal price,
        int stock
) {}
