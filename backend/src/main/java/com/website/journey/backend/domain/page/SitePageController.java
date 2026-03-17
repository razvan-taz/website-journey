package com.website.journey.backend.domain.page;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SitePageController {

    private final SitePageService sitePageService;

    public SitePageController(SitePageService sitePageService) {
        this.sitePageService = sitePageService;
    }

    @GetMapping("/api/site/pages/{slug}")
    public ResponseEntity<SitePageDto> getBySlugPublic(@PathVariable String slug) {
        return ResponseEntity.ok(sitePageService.getBySlug(slug));
    }

    @GetMapping("/api/admin/pages/{slug}")
    public ResponseEntity<SitePageDto> getBySlugAdmin(@PathVariable String slug) {
        return ResponseEntity.ok(sitePageService.getBySlug(slug));
    }

    @PutMapping("/api/admin/pages/{slug}")
    public ResponseEntity<SitePageDto> update(
            @PathVariable String slug,
            @Valid @RequestBody UpdateSitePageRequest request) {
        return ResponseEntity.ok(sitePageService.update(slug, request));
    }
}
