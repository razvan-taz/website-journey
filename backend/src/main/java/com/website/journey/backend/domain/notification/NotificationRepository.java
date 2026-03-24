package com.website.journey.backend.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByUserIdAndReviewedTrue(Long userId);

    long countByUserIdAndReviewedFalse(Long userId);
}
