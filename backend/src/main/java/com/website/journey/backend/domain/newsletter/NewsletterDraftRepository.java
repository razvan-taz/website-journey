package com.website.journey.backend.domain.newsletter;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsletterDraftRepository extends JpaRepository<NewsletterDraft, Long> {
    List<NewsletterDraft> findAllByOrderByUpdatedAtDesc();
}
