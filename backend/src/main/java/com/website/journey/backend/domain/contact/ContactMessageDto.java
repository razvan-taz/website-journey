package com.website.journey.backend.domain.contact;

import java.time.LocalDateTime;

public record ContactMessageDto(
        Long id,
        String name,
        String email,
        String message,
        boolean read,
        LocalDateTime createdAt
) {
}
