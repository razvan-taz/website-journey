package com.website.journey.backend.domain.review;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping
    public ResponseEntity<ReviewSummaryResponse> getReviews(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getReviews(productId));
    }

    @GetMapping("/eligibility")
    public ResponseEntity<ReviewEligibilityResponse> getEligibility(
            @PathVariable Long productId,
            Authentication authentication) {
        Long userId = reviewService.resolveUserId(authentication.getName());
        return ResponseEntity.ok(reviewService.getEligibility(productId, userId));
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> submitReview(
            @PathVariable Long productId,
            @Valid @RequestBody ReviewRequest request,
            Authentication authentication) {
        Long userId = reviewService.resolveUserId(authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewService.submitReview(productId, userId, request));
    }

    @DeleteMapping("/mine")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long productId,
            Authentication authentication) {
        Long userId = reviewService.resolveUserId(authentication.getName());
        reviewService.deleteReview(productId, userId);
        return ResponseEntity.noContent().build();
    }
}
