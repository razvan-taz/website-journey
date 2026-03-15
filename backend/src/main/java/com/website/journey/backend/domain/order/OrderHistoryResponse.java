package com.website.journey.backend.domain.order;

import java.math.BigDecimal;
import java.util.List;

public record OrderHistoryResponse(
        Long orderId,
        String status,
        BigDecimal total,
        String createdAt,
        List<OrderItemSummary> items
) {
    public record OrderItemSummary(String productName, BigDecimal unitPrice, Integer quantity) {}
}
