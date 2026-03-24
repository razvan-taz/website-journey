package com.website.journey.backend.domain.notification;

import java.time.LocalDateTime;

public record NotificationDto(
        Long id,
        String message,
        String type,
        Long orderId,
        boolean reviewed,
        LocalDateTime createdAt
) {}
