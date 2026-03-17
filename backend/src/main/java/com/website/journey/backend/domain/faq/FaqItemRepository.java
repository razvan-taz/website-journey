package com.website.journey.backend.domain.faq;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FaqItemRepository extends JpaRepository<FaqItem, Long> {

    List<FaqItem> findAllByOrderByPositionAsc();
}
