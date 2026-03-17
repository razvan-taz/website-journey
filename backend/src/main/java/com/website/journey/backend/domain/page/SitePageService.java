package com.website.journey.backend.domain.page;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SitePageService {

    private final SitePageRepository sitePageRepository;

    public SitePageService(SitePageRepository sitePageRepository) {
        this.sitePageRepository = sitePageRepository;
    }

    @Transactional(readOnly = true)
    public SitePageDto getBySlug(String slug) {
        SitePage page = sitePageRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Page not found: " + slug));
        return toDto(page);
    }

    @Transactional
    public SitePageDto update(String slug, UpdateSitePageRequest req) {
        SitePage page = sitePageRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Page not found: " + slug));

        page.setContent(req.content());

        return toDto(sitePageRepository.save(page));
    }

    private SitePageDto toDto(SitePage page) {
        return new SitePageDto(
                page.getSlug(),
                page.getContent(),
                page.getUpdatedAt()
        );
    }
}
