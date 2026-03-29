package com.website.journey.backend.domain.coupon;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CouponAdminDto(
        Long id,
        String code,
        CouponType type,
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
        Boolean active,
        long usageCount,
        LocalDateTime createdAt
) {
    public static CouponAdminDto from(Coupon c, long usageCount) {
        return new CouponAdminDto(
                c.getId(), c.getCode(), c.getType(), c.getValue(), c.getCap(),
                c.getMinOrderValue(), c.getTargetProductId(), c.getTargetCategory(),
                c.getFreeShipping(), c.getFirstOrderOnly(), c.getSingleUse(),
                c.getUsageLimit(), c.getPerUserLimit(), c.getExpiresAt(),
                c.getActive(), usageCount, c.getCreatedAt()
        );
    }
}
