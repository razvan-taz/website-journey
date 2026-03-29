package com.website.journey.backend.domain.order;

import java.math.BigDecimal;

public record OrderConfirmationResponse(Long orderId, String status, BigDecimal total, BigDecimal shippingAmount, String createdAt) {}
