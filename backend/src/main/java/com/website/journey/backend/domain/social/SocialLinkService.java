package com.website.journey.backend.domain.social;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class SocialLinkService {

    private final SocialLinkRepository socialLinkRepository;

    public SocialLinkService(SocialLinkRepository socialLinkRepository) {
        this.socialLinkRepository = socialLinkRepository;
    }

    @Transactional(readOnly = true)
    public List<SocialLinkDto> getAll() {
        return socialLinkRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SocialLinkDto> getEnabled() {
        return socialLinkRepository.findByEnabledTrue().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SocialLinkDto update(String platform, UpdateSocialLinkRequest request) {
        SocialLink link = socialLinkRepository.findByPlatform(platform)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Social link not found: " + platform));

        link.setUrl(request.url());
        link.setEnabled(request.enabled());

        return toDto(socialLinkRepository.save(link));
    }

    private SocialLinkDto toDto(SocialLink link) {
        return new SocialLinkDto(
                link.getPlatform(),
                link.getUrl(),
                link.isEnabled()
        );
    }
}
