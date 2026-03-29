package com.website.journey.backend.domain.user;

public record UserProfileResponse(Long id, String name, String email, String role, boolean emailVerified, boolean notificationsEnabled) {}
