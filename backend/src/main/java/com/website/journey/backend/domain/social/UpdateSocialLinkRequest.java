package com.website.journey.backend.domain.social;

public record UpdateSocialLinkRequest(
        String url,
        boolean enabled
) {
}
