package com.website.journey.backend.domain.faq;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FaqItemController {

    private final FaqItemService faqItemService;

    public FaqItemController(FaqItemService faqItemService) {
        this.faqItemService = faqItemService;
    }

    @GetMapping("/api/site/faq")
    public ResponseEntity<List<FaqItemDto>> getFaqPublic() {
        return ResponseEntity.ok(faqItemService.getAll());
    }

    @GetMapping("/api/admin/faq")
    public ResponseEntity<List<FaqItemDto>> getFaqAdmin() {
        return ResponseEntity.ok(faqItemService.getAll());
    }

    @PostMapping("/api/admin/faq")
    public ResponseEntity<FaqItemDto> create(@Valid @RequestBody CreateFaqRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(faqItemService.create(request));
    }

    @PutMapping("/api/admin/faq/{id}")
    public ResponseEntity<FaqItemDto> update(
            @PathVariable Long id,
            @Valid @RequestBody CreateFaqRequest request) {
        return ResponseEntity.ok(faqItemService.update(id, request));
    }

    @DeleteMapping("/api/admin/faq/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        faqItemService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/admin/faq/{id}/move-up")
    public ResponseEntity<List<FaqItemDto>> moveUp(@PathVariable Long id) {
        return ResponseEntity.ok(faqItemService.moveUp(id));
    }

    @PutMapping("/api/admin/faq/{id}/move-down")
    public ResponseEntity<List<FaqItemDto>> moveDown(@PathVariable Long id) {
        return ResponseEntity.ok(faqItemService.moveDown(id));
    }
}
