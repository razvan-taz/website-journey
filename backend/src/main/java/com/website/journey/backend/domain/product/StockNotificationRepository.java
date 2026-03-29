package com.website.journey.backend.domain.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockNotificationRepository extends JpaRepository<StockNotification, Long> {

    boolean existsByProductIdAndUserEmail(Long productId, String userEmail);

    List<StockNotification> findAllByProductId(Long productId);

    void deleteAllByProductId(Long productId);
}
