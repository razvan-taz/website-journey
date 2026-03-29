package com.website.journey.backend.domain.emailconfig;

import com.website.journey.backend.config.EncryptionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
public class EmailConfigService {

    private static final long CONFIG_ROW_ID = 1L;

    private final EmailConfigRepository emailConfigRepository;
    private final EncryptionService encryptionService;

    public EmailConfigService(EmailConfigRepository emailConfigRepository,
                              EncryptionService encryptionService) {
        this.emailConfigRepository = emailConfigRepository;
        this.encryptionService = encryptionService;
    }

    @Transactional(readOnly = true)
    public EmailConfig getConfig() {
        return emailConfigRepository.findById(CONFIG_ROW_ID)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Email configuration not found"));
    }

    /**
     * Returns the SMTP password decrypted for use by the mail sender.
     * Handles legacy plaintext passwords gracefully — if the stored value is not
     * a valid AES-GCM ciphertext, it is returned as-is (see EncryptionService.decrypt).
     */
    @Transactional(readOnly = true)
    public String getDecryptedSmtpPassword() {
        EmailConfig config = getConfig();
        return encryptionService.decrypt(config.getPassword());
    }

    @Transactional
    public EmailConfig updateConfig(UpdateEmailConfigRequest request) {
        EmailConfig config = getConfig();
        config.setSmtpHost(request.smtpHost());
        config.setSmtpPort(request.smtpPort());
        config.setUsername(request.username());
        // Keep existing (encrypted) password if the incoming password field is blank
        if (request.password() != null && !request.password().isBlank()) {
            config.setPassword(encryptionService.encrypt(request.password()));
        }
        config.setFromName(request.fromName());
        config.setFromAddress(request.fromAddress());
        config.setSslEnabled(request.sslEnabled());
        config.setUpdatedAt(LocalDateTime.now());
        return emailConfigRepository.save(config);
    }
}
