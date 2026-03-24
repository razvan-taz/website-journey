package com.website.journey.backend.domain.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateRefundRequest(
        @NotBlank @Size(max = 500) String reason
) {}
