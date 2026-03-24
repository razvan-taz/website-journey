package com.website.journey.backend.domain.newsletter;

public record NewsletterDraftDto(
        Long id,
        String subject,
        String body,
        String createdAt,
        String updatedAt
) {}
