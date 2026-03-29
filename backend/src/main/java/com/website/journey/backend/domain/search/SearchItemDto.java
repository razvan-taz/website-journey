package com.website.journey.backend.domain.search;

public record SearchItemDto(
        SearchResultDto item,
        Double score,
        Object highlights
) {}
