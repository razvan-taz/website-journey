package com.website.journey.backend.domain.order;

import java.math.BigDecimal;
import java.util.List;

public record OrderDetailResponse(
        Long orderId,
        String status,
        BigDecimal total,
        BigDecimal discountAmount,
        String discountCode,
        BigDecimal shippingAmount,
        String createdAt,
        String updatedAt,
        ShippingAddress shippingAddress,
        List<OrderHistoryResponse.OrderItemSummary> items
) {
    public record ShippingAddress(
            String name,
            String line1,
            String city,
            String state,
            String zip,
            String country
    ) {}
}
