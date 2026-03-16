package com.website.journey.backend.domain.review;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewRequest {

    @NotBlank
    private String body;
}
