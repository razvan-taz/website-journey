package com.website.journey.backend.domain.emailconfig;

import com.website.journey.backend.config.EmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/email-config")
public class EmailConfigController {

    private final EmailConfigService emailConfigService;
    private final EmailService emailService;

    public EmailConfigController(EmailConfigService emailConfigService, EmailService emailService) {
        this.emailConfigService = emailConfigService;
        this.emailService = emailService;
    }

    @GetMapping
    public ResponseEntity<EmailConfigResponse> getConfig() {
        return ResponseEntity.ok(EmailConfigResponse.from(emailConfigService.getConfig()));
    }

    @PutMapping
    public ResponseEntity<EmailConfigResponse> updateConfig(
            @Valid @RequestBody UpdateEmailConfigRequest request) {
        EmailConfig updated = emailConfigService.updateConfig(request);
        return ResponseEntity.ok(EmailConfigResponse.from(updated));
    }

    @PostMapping("/test")
    public ResponseEntity<Void> sendTestEmail() {
        emailService.sendTestEmail();
        return ResponseEntity.ok().build();
    }
}
