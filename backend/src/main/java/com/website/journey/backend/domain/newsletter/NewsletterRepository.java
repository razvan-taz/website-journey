package com.website.journey.backend.domain.newsletter;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscriber, Long> {
    boolean existsByEmail(String email);
    Page<NewsletterSubscriber> findAllByOrderBySubscribedAtDesc(Pageable pageable);
    java.util.Optional<NewsletterSubscriber> findByUnsubscribeToken(java.util.UUID token);
}
