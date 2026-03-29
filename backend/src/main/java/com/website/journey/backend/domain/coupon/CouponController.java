package com.website.journey.backend.domain.coupon;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.website.journey.backend.domain.user.UserRepository;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponValidationService couponValidationService;
    private final UserRepository userRepository;

    public CouponController(CouponValidationService couponValidationService, UserRepository userRepository) {
        this.couponValidationService = couponValidationService;
        this.userRepository = userRepository;
    }

    @PostMapping("/validate")
    public ResponseEntity<CouponValidationResult> validate(@Valid @RequestBody CouponValidationRequest request) {
        Long userId = resolveUserIdOptional();
        CouponValidationResult result = couponValidationService.validate(request.code(), userId, request.cartItems());
        return ResponseEntity.ok(result);
    }

    private Long resolveUserIdOptional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(auth.getName()).map(u -> u.getId()).orElse(null);
    }
}
