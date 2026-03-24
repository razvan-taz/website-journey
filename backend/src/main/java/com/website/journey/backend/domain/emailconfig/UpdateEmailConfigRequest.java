package com.website.journey.backend.domain.emailconfig;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record UpdateEmailConfigRequest(
        @NotBlank String smtpHost,
        @Min(1) int smtpPort,
        @NotBlank String username,
        String password,
        @NotBlank String fromName,
        @NotBlank @Email String fromAddress,
        boolean sslEnabled
) {}
