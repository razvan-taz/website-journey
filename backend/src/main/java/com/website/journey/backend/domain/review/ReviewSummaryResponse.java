package com.website.journey.backend.domain.review;

import java.util.List;

public record ReviewSummaryResponse(
        long totalReviews,
        List<ReviewResponse> reviews
) {}
