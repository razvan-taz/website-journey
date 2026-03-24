package com.website.journey.backend.domain.article;

public record ArticleListDto(
        Long id,
        String title,
        String slug,
        String author,
        String publishDate,
        String thumbnailUrl,
        String type,
        String tag,
        String videoUrl,
        boolean breakingNews,
        ArticleStatus status,
        long viewCount,
        String scheduledAt,
        ArticleCategory category,
        String tags,
        Integer readingTimeMinutes
) {}
