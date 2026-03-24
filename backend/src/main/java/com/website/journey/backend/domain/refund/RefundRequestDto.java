package com.website.journey.backend.domain.refund;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RefundRequestDto(
        Long id,
        Long orderId,
        BigDecimal orderTotal,
        String userEmail,
        String reason,
        RefundStatus status,
        LocalDateTime requestedAt,
        LocalDateTime processedAt,
        String processedBy,
        String stripeRefundId
) {}
