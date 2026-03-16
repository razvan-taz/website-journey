package com.website.journey.backend.domain.discount;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/discount")
public class DiscountController {

    private final DiscountCodeRepository discountCodeRepository;

    public DiscountController(DiscountCodeRepository discountCodeRepository) {
        this.discountCodeRepository = discountCodeRepository;
    }

    @GetMapping("/validate")
    public ResponseEntity<DiscountValidationResponse> validate(
            @RequestParam String code,
            @RequestParam BigDecimal subtotal) {

        DiscountCode discount = discountCodeRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid discount code"));

        if (!discount.getActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This code is no longer active");
        }
        if (discount.getExpiresAt() != null && discount.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This code has expired");
        }
        if (discount.getMaxUses() != null && discount.getUses() >= discount.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This code has reached its usage limit");
        }

        BigDecimal amount;
        if ("PERCENT".equals(discount.getDiscountType())) {
            amount = subtotal.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            amount = discount.getDiscountValue().min(subtotal);
        }

        return ResponseEntity.ok(new DiscountValidationResponse(
                discount.getCode().toUpperCase(),
                discount.getDiscountType(),
                discount.getDiscountValue(),
                amount
        ));
    }

    public record DiscountValidationResponse(
            String code,
            String type,
            BigDecimal value,
            BigDecimal discountAmount
    ) {}
}
