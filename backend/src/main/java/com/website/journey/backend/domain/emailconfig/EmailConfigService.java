package com.website.journey.backend.domain.emailconfig;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
public class EmailConfigService {

    private static final long CONFIG_ROW_ID = 1L;

    private final EmailConfigRepository emailConfigRepository;

    public EmailConfigService(EmailConfigRepository emailConfigRepository) {
        this.emailConfigRepository = emailConfigRepository;
    }

    @Transactional(readOnly = true)
    public EmailConfig getConfig() {
        return emailConfigRepository.findById(CONFIG_ROW_ID)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Email configuration not found"));
    }

    @Transactional
    public EmailConfig updateConfig(UpdateEmailConfigRequest request) {
        EmailConfig config = getConfig();
        config.setSmtpHost(request.smtpHost());
        config.setSmtpPort(request.smtpPort());
        config.setUsername(request.username());
        // Keep existing password if the incoming password field is blank
        if (request.password() != null && !request.password().isBlank()) {
            config.setPassword(request.password());
        }
        config.setFromName(request.fromName());
        config.setFromAddress(request.fromAddress());
        config.setSslEnabled(request.sslEnabled());
        config.setUpdatedAt(LocalDateTime.now());
        return emailConfigRepository.save(config);
    }
}
