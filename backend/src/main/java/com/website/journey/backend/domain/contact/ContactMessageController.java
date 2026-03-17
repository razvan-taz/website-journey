package com.website.journey.backend.domain.contact;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContactMessageController {

    private final ContactMessageService contactMessageService;

    public ContactMessageController(ContactMessageService contactMessageService) {
        this.contactMessageService = contactMessageService;
    }

    @PostMapping("/api/contact")
    public ResponseEntity<Void> submit(@Valid @RequestBody ContactFormRequest request) {
        contactMessageService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/api/admin/contact-messages")
    public ResponseEntity<Page<ContactMessageDto>> getAll(Pageable pageable) {
        return ResponseEntity.ok(contactMessageService.getAll(pageable));
    }

    @PatchMapping("/api/admin/contact-messages/{id}/read")
    public ResponseEntity<ContactMessageDto> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(contactMessageService.markRead(id));
    }

    @DeleteMapping("/api/admin/contact-messages/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        contactMessageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
