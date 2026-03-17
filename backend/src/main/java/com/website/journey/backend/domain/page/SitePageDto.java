package com.website.journey.backend.domain.page;

import java.time.LocalDateTime;

public record SitePageDto(
        String slug,
        String content,
        LocalDateTime updatedAt
) {
}
