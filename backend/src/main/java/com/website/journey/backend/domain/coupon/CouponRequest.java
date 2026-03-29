package com.website.journey.backend.domain.coupon;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CouponRequest(
        @NotBlank String code,
        @NotNull CouponType type,
        BigDecimal value,
        BigDecimal cap,
        BigDecimal minOrderValue,
        Long targetProductId,
        String targetCategory,
        Boolean freeShipping,
        Boolean firstOrderOnly,
        Boolean singleUse,
        Integer usageLimit,
        Integer perUserLimit,
        LocalDateTime expiresAt,
        Boolean active
) {}
