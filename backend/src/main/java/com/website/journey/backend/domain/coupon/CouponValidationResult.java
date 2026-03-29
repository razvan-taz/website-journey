package com.website.journey.backend.domain.coupon;

import java.math.BigDecimal;

public record CouponValidationResult(
        boolean valid,
        String code,
        String type,
        BigDecimal discountAmount,
        boolean freeShipping,
        String description,
        String error
) {
    public static CouponValidationResult invalid(String code, String error) {
        return new CouponValidationResult(false, code, null, BigDecimal.ZERO, false, null, error);
    }
}
