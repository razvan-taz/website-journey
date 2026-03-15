package com.website.journey.backend.domain.article;

public record ArticleSeoDto(
        String metaTitle,
        String metaDescription,
        String canonicalUrl,
        String ogImage,
        String publishDate,
        String author
) {}
