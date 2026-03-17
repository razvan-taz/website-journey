package com.website.journey.backend.domain.faq;

public record FaqItemDto(
        Long id,
        String question,
        String answer,
        int position
) {
}
