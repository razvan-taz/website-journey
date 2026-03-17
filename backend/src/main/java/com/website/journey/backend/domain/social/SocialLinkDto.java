package com.website.journey.backend.domain.social;

public record SocialLinkDto(
        String platform,
        String url,
        boolean enabled
) {
}
