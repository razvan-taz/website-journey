package com.website.journey.backend.domain.social;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SocialLinkRepository extends JpaRepository<SocialLink, Long> {

    List<SocialLink> findByEnabledTrue();

    Optional<SocialLink> findByPlatform(String platform);
}
