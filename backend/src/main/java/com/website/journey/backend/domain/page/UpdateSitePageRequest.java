package com.website.journey.backend.domain.page;

import jakarta.validation.constraints.NotBlank;

public record UpdateSitePageRequest(
        @NotBlank String content
) {
}
