package com.website.journey.backend.domain.page;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SitePageRepository extends JpaRepository<SitePage, Long> {

    Optional<SitePage> findBySlug(String slug);
}
