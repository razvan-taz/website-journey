package com.website.journey.backend.domain.review;

import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.product.ProductRepository;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public ReviewService(ProductReviewRepository reviewRepository,
                         UserRepository userRepository,
                         OrderRepository orderRepository,
                         ProductRepository productRepository) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviews(Long productId) {
        List<ProductReview> reviews = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
        // Batch-fetch user names to avoid N+1
        List<Long> userIds = reviews.stream().map(ProductReview::getUserId).distinct().toList();
        Map<Long, String> nameByUserId = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getName()));
        List<ReviewResponse> reviewResponses = reviews.stream()
                .map(r -> new ReviewResponse(
                        r.getId(), r.getProductId(), r.getUserId(),
                        nameByUserId.getOrDefault(r.getUserId(), "Anonymous"),
                        r.getBody(), r.getCreatedAt()))
                .toList();
        long total = reviewRepository.countByProductId(productId);
        return new ReviewSummaryResponse(total, reviewResponses);
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

    @Transactional(readOnly = true)
    public Page<AdminReviewDto> findAllAdmin(Pageable pageable) {
        Page<ProductReview> page = reviewRepository.findAllByOrderByCreatedAtDesc(pageable);
        // Batch-fetch user names and product names to avoid N+1
        List<Long> userIds = page.stream().map(ProductReview::getUserId).distinct().toList();
        List<Long> productIds = page.stream().map(ProductReview::getProductId).distinct().toList();
        Map<Long, String> nameByUserId = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getName()));
        Map<Long, String> nameByProductId = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(p -> p.getId(), p -> p.getName()));
        return page.map(r -> new AdminReviewDto(
                r.getId(), r.getProductId(),
                nameByProductId.getOrDefault(r.getProductId(), "Unknown Product"),
                r.getUserId(),
                nameByUserId.getOrDefault(r.getUserId(), "Anonymous"),
                r.getBody(), r.getCreatedAt()));
    }

    @Transactional
    public void deleteByIdAdmin(Long reviewId) {
        if (!reviewRepository.existsById(reviewId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found");
        }
        reviewRepository.deleteById(reviewId);
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
                review.getUserId(),
                userName,
                review.getBody(),
                review.getCreatedAt()
        );
    }
}
