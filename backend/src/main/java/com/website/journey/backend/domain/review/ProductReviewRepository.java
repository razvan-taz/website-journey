package com.website.journey.backend.domain.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    List<ProductReview> findByProductIdOrderByCreatedAtDesc(Long productId);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    Optional<ProductReview> findByProductIdAndUserId(Long productId, Long userId);

    long countByProductId(Long productId);
}
