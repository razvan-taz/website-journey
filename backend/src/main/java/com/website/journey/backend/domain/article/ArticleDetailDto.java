package com.website.journey.backend.domain.article;

import java.util.List;

public record ArticleDetailDto(
        Long id,
        String title,
        String body,
        String slug,
        String author,
        String publishDate,
        String thumbnailUrl,
        String type,
        String tag,
        String createdAt,
        String updatedAt,
        ArticleSeoDto seo,
        List<RelatedArticleDto> relatedArticles,
        boolean premium,
        boolean accessDenied
) {}
