package com.website.journey.backend.domain.coupon;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Slf4j
@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;

    public CouponService(CouponRepository couponRepository, CouponUsageRepository couponUsageRepository) {
        this.couponRepository = couponRepository;
        this.couponUsageRepository = couponUsageRepository;
    }

    @Transactional(readOnly = true)
    public Page<CouponAdminDto> listAll(Pageable pageable) {
        return couponRepository.findAll(pageable).map(c -> {
            long usageCount = couponUsageRepository.countByCouponId(c.getId());
            return CouponAdminDto.from(c, usageCount);
        });
    }

    @Transactional
    public CouponAdminDto create(CouponRequest request) {
        if (couponRepository.findByCodeIgnoreCase(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Coupon code already exists");
        }
        Coupon coupon = buildFromRequest(new Coupon(), request);
        coupon.setCode(request.code().toUpperCase());
        Coupon saved = couponRepository.save(coupon);
        return CouponAdminDto.from(saved, 0);
    }

    @Transactional
    public CouponAdminDto update(Long id, CouponRequest request) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found"));
        buildFromRequest(coupon, request);
        Coupon saved = couponRepository.save(coupon);
        long usageCount = couponUsageRepository.countByCouponId(saved.getId());
        return CouponAdminDto.from(saved, usageCount);
    }

    @Transactional
    public void delete(Long id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found"));
        couponRepository.delete(coupon);
    }

    @Transactional
    public void recordUsage(String code, Long userId, Long orderId) {
        couponRepository.findByCodeIgnoreCase(code).ifPresentOrElse(
            coupon -> {
                CouponUsage usage = CouponUsage.builder()
                        .coupon(coupon)
                        .userId(userId)
                        .orderId(orderId)
                        .build();
                couponUsageRepository.save(usage);
            },
            () -> log.warn("recordUsage: coupon code '{}' not found — usage not recorded for order {}", code, orderId)
        );
    }

    private Coupon buildFromRequest(Coupon coupon, CouponRequest request) {
        coupon.setType(request.type());
        coupon.setValue(request.value());
        coupon.setCap(request.cap());
        coupon.setMinOrderValue(request.minOrderValue());
        coupon.setTargetProductId(request.targetProductId());
        coupon.setTargetCategory(request.targetCategory());
        coupon.setFreeShipping(Boolean.TRUE.equals(request.freeShipping()));
        coupon.setFirstOrderOnly(Boolean.TRUE.equals(request.firstOrderOnly()));
        coupon.setSingleUse(Boolean.TRUE.equals(request.singleUse()));
        coupon.setUsageLimit(request.usageLimit());
        coupon.setPerUserLimit(request.perUserLimit());
        coupon.setExpiresAt(request.expiresAt());
        coupon.setActive(request.active() != null ? request.active() : true);
        return coupon;
    }
}
