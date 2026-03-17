package com.website.journey.backend.domain.faq;

import jakarta.validation.constraints.NotBlank;

public record CreateFaqRequest(
        @NotBlank String question,
        @NotBlank String answer
) {
}
