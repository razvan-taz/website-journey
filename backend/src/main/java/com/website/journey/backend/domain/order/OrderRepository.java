package com.website.journey.backend.domain.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.userId = :userId ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithItemsOrderByCreatedAtDesc(@Param("userId") Long userId);

    Optional<Order> findByPaymentIntentId(String paymentIntentId);

    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Order o JOIN o.items i WHERE o.userId = :userId AND i.productId = :productId AND o.status = 'PAID'")
    boolean existsPaidOrderWithProduct(@Param("userId") Long userId, @Param("productId") Long productId);

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = 'PAID' AND o.createdAt >= :start")
    BigDecimal sumPaidTotalSince(@Param("start") LocalDateTime start);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = 'PAID'")
    BigDecimal sumPaidTotalAll();
}
