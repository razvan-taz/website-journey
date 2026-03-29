package com.website.journey.backend.domain.review;

import java.time.LocalDateTime;

public record AdminReviewDto(
        Long id,
        Long productId,
        String productName,
        Long userId,
        String userName,
        String body,
        LocalDateTime createdAt
) {}
