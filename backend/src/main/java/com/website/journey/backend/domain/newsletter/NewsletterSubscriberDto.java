package com.website.journey.backend.domain.newsletter;

public record NewsletterSubscriberDto(
        Long id,
        String email,
        String subscribedAt
) {}
