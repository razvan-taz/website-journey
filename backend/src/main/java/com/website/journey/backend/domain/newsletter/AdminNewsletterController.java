package com.website.journey.backend.domain.newsletter;

import com.website.journey.backend.config.EmailService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/newsletter")
public class AdminNewsletterController {

    private final NewsletterRepository newsletterRepository;
    private final NewsletterDraftRepository draftRepository;
    private final EmailService emailService;

    @Value("${app.base-url}")
    private String baseUrl;

    public AdminNewsletterController(NewsletterRepository newsletterRepository,
                                     NewsletterDraftRepository draftRepository,
                                     EmailService emailService) {
        this.newsletterRepository = newsletterRepository;
        this.draftRepository = draftRepository;
        this.emailService = emailService;
    }

    public record SendNewsletterRequest(String subject, String body) {}
    public record DraftRequest(String subject, String body) {}

    // ── Subscribers ────────────────────────────────────────────────

    @GetMapping("/subscribers")
    public ResponseEntity<Page<NewsletterSubscriberDto>> listSubscribers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<NewsletterSubscriberDto> result = newsletterRepository
                .findAllByOrderBySubscribedAtDesc(PageRequest.of(page, size))
                .map(s -> new NewsletterSubscriberDto(
                        s.getId(),
                        s.getEmail(),
                        s.getSubscribedAt() != null ? s.getSubscribedAt().toString() : null));
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/subscribers/{id}")
    public ResponseEntity<Void> deleteSubscriber(@PathVariable Long id) {
        if (!newsletterRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscriber not found");
        }
        newsletterRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Send ───────────────────────────────────────────────────────

    @PostMapping("/send")
    public ResponseEntity<Map<String, Integer>> sendNewsletter(@RequestBody SendNewsletterRequest request) {
        List<NewsletterSubscriber> subscribers = newsletterRepository.findAll();
        for (NewsletterSubscriber subscriber : subscribers) {
            String unsubscribeUrl = baseUrl + "/unsubscribe?token=" + subscriber.getUnsubscribeToken();
            emailService.sendNewsletterToSubscriber(subscriber.getEmail(), request.subject(), request.body(), unsubscribeUrl);
        }
        return ResponseEntity.ok(Map.of("recipientCount", subscribers.size()));
    }

    @GetMapping("/subscribers/export")
    public void exportSubscribersCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"subscribers.csv\"");
        List<NewsletterSubscriber> all = newsletterRepository.findAll();
        try (java.io.PrintWriter writer = response.getWriter()) {
            writer.println("#,email,subscribed_at");
            int row = 1;
            for (NewsletterSubscriber s : all) {
                writer.printf("%d,%s,%s%n", row++, s.getEmail(),
                        s.getSubscribedAt() != null ? s.getSubscribedAt().toString() : "");
            }
        }
    }

    // ── Drafts ─────────────────────────────────────────────────────

    @GetMapping("/drafts")
    public ResponseEntity<List<NewsletterDraftDto>> listDrafts() {
        List<NewsletterDraftDto> drafts = draftRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(d -> new NewsletterDraftDto(
                        d.getId(),
                        d.getSubject(),
                        d.getBody(),
                        d.getCreatedAt().toString(),
                        d.getUpdatedAt().toString()))
                .toList();
        return ResponseEntity.ok(drafts);
    }

    @PostMapping("/drafts")
    public ResponseEntity<NewsletterDraftDto> createDraft(@RequestBody DraftRequest request) {
        NewsletterDraft draft = draftRepository.save(
                NewsletterDraft.builder()
                        .subject(request.subject())
                        .body(request.body())
                        .build());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(draft));
    }

    @PutMapping("/drafts/{id}")
    public ResponseEntity<NewsletterDraftDto> updateDraft(@PathVariable Long id,
                                                          @RequestBody DraftRequest request) {
        NewsletterDraft draft = draftRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
        draft.setSubject(request.subject());
        draft.setBody(request.body());
        return ResponseEntity.ok(toDto(draftRepository.save(draft)));
    }

    @DeleteMapping("/drafts/{id}")
    public ResponseEntity<Void> deleteDraft(@PathVariable Long id) {
        if (!draftRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found");
        }
        draftRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private NewsletterDraftDto toDto(NewsletterDraft d) {
        return new NewsletterDraftDto(
                d.getId(),
                d.getSubject(),
                d.getBody(),
                d.getCreatedAt().toString(),
                d.getUpdatedAt().toString());
    }
}
