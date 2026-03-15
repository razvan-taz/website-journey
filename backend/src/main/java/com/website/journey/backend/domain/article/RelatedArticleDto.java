package com.website.journey.backend.domain.article;

public record RelatedArticleDto(
        Long id,
        String title,
        String slug,
        String thumbnailUrl,
        String author,
        String publishDate
) {}
