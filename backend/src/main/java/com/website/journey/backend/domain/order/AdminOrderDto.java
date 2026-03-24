package com.website.journey.backend.domain.order;

import java.math.BigDecimal;

public record AdminOrderDto(
        Long id,
        String customerEmail,
        int itemCount,
        BigDecimal total,
        String status,
        String paymentIntentId,
        String createdAt
) {}
