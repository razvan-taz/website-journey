package com.website.journey.backend.domain.emailconfig;

import java.time.LocalDateTime;

public record EmailConfigResponse(
        String smtpHost,
        int smtpPort,
        String username,
        String password,    // always returned as empty string — never expose the actual password
        String fromName,
        String fromAddress,
        boolean sslEnabled,
        LocalDateTime updatedAt
) {
    public static EmailConfigResponse from(EmailConfig config) {
        return new EmailConfigResponse(
                config.getSmtpHost(),
                config.getSmtpPort(),
                config.getUsername(),
                "",             // mask password
                config.getFromName(),
                config.getFromAddress(),
                config.isSslEnabled(),
                config.getUpdatedAt()
        );
    }
}
