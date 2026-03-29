package com.website.journey.backend.domain.shipping;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ShippingConfigDto(
        BigDecimal price,
        String currency,
        LocalDateTime updatedAt
) {
    public static ShippingConfigDto from(ShippingConfig config) {
        return new ShippingConfigDto(config.getPrice(), config.getCurrency(), config.getUpdatedAt());
    }
}
