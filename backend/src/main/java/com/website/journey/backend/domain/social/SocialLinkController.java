package com.website.journey.backend.domain.social;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class SocialLinkController {

    private final SocialLinkService socialLinkService;

    public SocialLinkController(SocialLinkService socialLinkService) {
        this.socialLinkService = socialLinkService;
    }

    @GetMapping("/api/site/social-links")
    public ResponseEntity<List<SocialLinkDto>> getEnabled() {
        return ResponseEntity.ok(socialLinkService.getEnabled());
    }

    @GetMapping("/api/admin/social-links")
    public ResponseEntity<List<SocialLinkDto>> getAll() {
        return ResponseEntity.ok(socialLinkService.getAll());
    }

    @PutMapping("/api/admin/social-links/{platform}")
    public ResponseEntity<SocialLinkDto> update(
            @PathVariable String platform,
            @RequestBody UpdateSocialLinkRequest request) {
        return ResponseEntity.ok(socialLinkService.update(platform, request));
    }
}
