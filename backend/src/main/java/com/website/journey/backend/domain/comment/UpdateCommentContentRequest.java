package com.website.journey.backend.domain.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCommentContentRequest(
        @NotBlank @Size(max = 2000) String content
) {}
