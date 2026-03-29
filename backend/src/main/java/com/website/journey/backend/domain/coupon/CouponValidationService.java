package com.website.journey.backend.domain.coupon;

import com.website.journey.backend.domain.order.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CouponValidationService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderRepository orderRepository;

    public CouponValidationService(CouponRepository couponRepository,
                                   CouponUsageRepository couponUsageRepository,
                                   OrderRepository orderRepository) {
        this.couponRepository = couponRepository;
        this.couponUsageRepository = couponUsageRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public CouponValidationResult validate(String code, Long userId,
                                           List<CouponValidationRequest.CartItemDto> cartItems) {
        Coupon coupon = couponRepository.findByCodeIgnoreCase(code).orElse(null);
        if (coupon == null || !Boolean.TRUE.equals(coupon.getActive())) {
            return CouponValidationResult.invalid(code, "Invalid or inactive coupon code");
        }

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now())) {
            return CouponValidationResult.invalid(code, "Invalid or expired coupon code");
        }

        if (coupon.getUsageLimit() != null) {
            long totalUsages = couponUsageRepository.countByCouponId(coupon.getId());
            if (totalUsages >= coupon.getUsageLimit()) {
                return CouponValidationResult.invalid(code, "Invalid or expired coupon code");
            }
        }

        if (userId != null && coupon.getPerUserLimit() != null) {
            long userUsages = couponUsageRepository.countByCouponIdAndUserId(coupon.getId(), userId);
            if (userUsages >= coupon.getPerUserLimit()) {
                return CouponValidationResult.invalid(code, "You have already used this coupon the maximum number of times");
            }
        }

        BigDecimal cartTotal = cartItems.stream()
                .map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (coupon.getMinOrderValue() != null && cartTotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return CouponValidationResult.invalid(code,
                    "Minimum order value of " + coupon.getMinOrderValue() + " required");
        }

        if (Boolean.TRUE.equals(coupon.getFirstOrderOnly()) && userId != null) {
            long completedOrders = orderRepository.countByUserIdAndStatus(userId, "DELIVERED");
            if (completedOrders > 0) {
                return CouponValidationResult.invalid(code, "This coupon is for first-time orders only");
            }
        }

        if (coupon.getType() == CouponType.PER_PRODUCT) {
            boolean hasMatchingProduct = cartItems.stream()
                    .anyMatch(item -> coupon.getTargetProductId().equals(item.productId()));
            if (!hasMatchingProduct) {
                return CouponValidationResult.invalid(code, "Coupon does not apply to items in your cart");
            }
        }

        if (coupon.getType() == CouponType.PER_CATEGORY) {
            boolean hasMatchingCategory = cartItems.stream()
                    .anyMatch(item -> coupon.getTargetCategory() != null
                            && coupon.getTargetCategory().equalsIgnoreCase(item.category()));
            if (!hasMatchingCategory) {
                return CouponValidationResult.invalid(code, "Coupon does not apply to items in your cart");
            }
        }

        BigDecimal discount = calculateDiscount(coupon, cartItems, cartTotal);
        boolean isFreeShipping = Boolean.TRUE.equals(coupon.getFreeShipping())
                || coupon.getType() == CouponType.FREE_SHIPPING;

        return new CouponValidationResult(
                true,
                coupon.getCode(),
                coupon.getType().name(),
                discount,
                isFreeShipping,
                buildDescription(coupon),
                null
        );
    }

    private BigDecimal calculateDiscount(Coupon coupon, List<CouponValidationRequest.CartItemDto> cartItems,
                                         BigDecimal cartTotal) {
        return switch (coupon.getType()) {
            case FIXED_AMOUNT, FIRST_ORDER ->
                    cartTotal.min(coupon.getValue()).max(BigDecimal.ZERO);
            case PERCENTAGE ->
                    cartTotal.multiply(coupon.getValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                            .setScale(2, RoundingMode.HALF_UP);
            case PERCENTAGE_WITH_CAP -> {
                BigDecimal pct = cartTotal.multiply(coupon.getValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                        .setScale(2, RoundingMode.HALF_UP);
                yield coupon.getCap() != null ? pct.min(coupon.getCap()) : pct;
            }
            case PER_PRODUCT -> {
                BigDecimal total = cartItems.stream()
                        .filter(item -> coupon.getTargetProductId().equals(item.productId()))
                        .map(item -> coupon.getValue().multiply(BigDecimal.valueOf(item.quantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                yield total.min(cartTotal).setScale(2, RoundingMode.HALF_UP);
            }
            case PER_CATEGORY -> {
                BigDecimal total = cartItems.stream()
                        .filter(item -> coupon.getTargetCategory() != null
                                && coupon.getTargetCategory().equalsIgnoreCase(item.category()))
                        .map(item -> coupon.getValue().multiply(BigDecimal.valueOf(item.quantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                yield total.min(cartTotal).setScale(2, RoundingMode.HALF_UP);
            }
            case FREE_SHIPPING -> BigDecimal.ZERO;
        };
    }

    private String buildDescription(Coupon coupon) {
        return switch (coupon.getType()) {
            case FIXED_AMOUNT -> coupon.getValue() + " off your order";
            case PERCENTAGE -> coupon.getValue().stripTrailingZeros().toPlainString() + "% off your order";
            case PERCENTAGE_WITH_CAP -> coupon.getValue().stripTrailingZeros().toPlainString() + "% off (up to " + coupon.getCap() + ")";
            case PER_PRODUCT -> coupon.getValue() + " off eligible products";
            case PER_CATEGORY -> coupon.getValue() + " off eligible category items";
            case FREE_SHIPPING -> "Free shipping on your order";
            case FIRST_ORDER -> "First order discount applied";
        };
    }
}
