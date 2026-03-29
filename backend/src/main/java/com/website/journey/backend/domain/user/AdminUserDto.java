package com.website.journey.backend.domain.user;

import java.time.LocalDateTime;

public record AdminUserDto(
        Long id,
        String email,
        String name,
        String role,
        boolean enabled,
        boolean emailVerified,
        LocalDateTime createdAt,
        long orderCount
) {}
