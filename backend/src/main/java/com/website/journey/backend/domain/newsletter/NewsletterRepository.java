package com.website.journey.backend.domain.newsletter;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscriber, Long> {
    boolean existsByEmail(String email);
}
