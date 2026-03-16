package com.website.journey.backend.domain.review;

public record ReviewEligibilityResponse(
        boolean canReview,
        boolean hasReviewed
) {}
