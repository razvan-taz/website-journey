package com.website.journey.backend.domain.refund;

import jakarta.validation.constraints.NotBlank;

public record RejectRefundRequest(
        @NotBlank String reason
) {}
