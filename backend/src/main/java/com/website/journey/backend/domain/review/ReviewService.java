package com.website.journey.backend.domain.review;

import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public ReviewService(ProductReviewRepository reviewRepository,
                         UserRepository userRepository,
                         OrderRepository orderRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviews(Long productId) {
        List<ReviewResponse> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId)
                .stream()
                .map(this::toResponse)
                .toList();
        long total = reviewRepository.countByProductId(productId);
        return new ReviewSummaryResponse(total, reviews);
    }

    @Transactional(readOnly = true)
    public ReviewEligibilityResponse getEligibility(Long productId, Long userId) {
        boolean hasPurchased = orderRepository.existsPaidOrderWithProduct(userId, productId);
        boolean hasReviewed = reviewRepository.existsByProductIdAndUserId(productId, userId);
        return new ReviewEligibilityResponse(hasPurchased && !hasReviewed, hasReviewed);
    }

    @Transactional
    public ReviewResponse submitReview(Long productId, Long userId, ReviewRequest request) {
        if (!orderRepository.existsPaidOrderWithProduct(userId, productId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You must purchase this product before reviewing it");
        }
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already reviewed this product");
        }
        ProductReview review = ProductReview.builder()
                .productId(productId)
                .userId(userId)
                .body(request.getBody())
                .build();
        return toResponse(reviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(Long productId, Long userId) {
        ProductReview review = reviewRepository.findByProductIdAndUserId(productId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
        reviewRepository.delete(review);
    }

    public Long resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getId();
    }

    private ReviewResponse toResponse(ProductReview review) {
        String userName = userRepository.findById(review.getUserId())
                .map(u -> u.getName())
                .orElse("Anonymous");
        return new ReviewResponse(
                review.getId(),
                review.getProductId(),
                userName,
                review.getBody(),
                review.getCreatedAt()
        );
    }
}
