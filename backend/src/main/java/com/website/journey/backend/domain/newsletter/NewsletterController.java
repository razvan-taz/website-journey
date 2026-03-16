package com.website.journey.backend.domain.newsletter;

import com.website.journey.backend.config.EmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/newsletter")
public class NewsletterController {

    private final NewsletterRepository newsletterRepository;
    private final EmailService emailService;

    public NewsletterController(NewsletterRepository newsletterRepository, EmailService emailService) {
        this.newsletterRepository = newsletterRepository;
        this.emailService = emailService;
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@Valid @RequestBody SubscribeRequest request) {
        if (newsletterRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already subscribed");
        }
        newsletterRepository.save(NewsletterSubscriber.builder().email(request.getEmail()).build());
        emailService.sendNewsletterConfirmation(request.getEmail());
        return ResponseEntity.ok().build();
    }

    @Data
    public static class SubscribeRequest {
        @NotBlank
        @Email
        private String email;
    }
}
