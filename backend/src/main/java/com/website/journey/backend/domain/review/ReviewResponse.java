package com.website.journey.backend.domain.review;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long productId,
        String userName,
        String body,
        LocalDateTime createdAt
) {}
