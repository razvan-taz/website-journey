package com.website.journey.backend.domain.comment;

import java.time.LocalDateTime;

public record CommentDto(
        Long id,
        String content,
        Long authorId,
        String authorName,
        String targetType,
        Long targetId,
        CommentStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
