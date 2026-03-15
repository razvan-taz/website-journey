package com.website.journey.backend.domain.search;

public record SearchResultDto(
        String id,
        String title,
        String summary,
        String type,
        String route
) {}
