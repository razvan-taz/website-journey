package com.website.journey.backend.domain.search;

import java.util.List;

public record SearchResponseDto(
        List<SearchItemDto> results,
        Object facets,
        String query,
        int page,
        int size,
        int totalResults
) {}
