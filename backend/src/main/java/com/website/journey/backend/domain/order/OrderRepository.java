package com.website.journey.backend.domain.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items WHERE o.userId = :userId ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithItemsOrderByCreatedAtDesc(@Param("userId") Long userId);

    Optional<Order> findByPaymentIntentId(String paymentIntentId);

    @Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Order o JOIN o.items i WHERE o.userId = :userId AND i.productId = :productId AND o.status = 'PAID'")
    boolean existsPaidOrderWithProduct(@Param("userId") Long userId, @Param("productId") Long productId);

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    long countByStatus(String status);

    long countByUserIdAndStatus(Long userId, String status);

    long countByUserId(Long userId);

    // SH-003-07: batch count query — single DB call instead of N queries for a page of users
    @Query("SELECT o.userId, COUNT(o) FROM Order o WHERE o.userId IN :userIds GROUP BY o.userId")
    List<Object[]> countOrdersByUserIds(@Param("userIds") List<Long> userIds);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = 'PAID' AND o.createdAt >= :start")
    BigDecimal sumPaidTotalSince(@Param("start") LocalDateTime start);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status = 'PAID'")
    BigDecimal sumPaidTotalAll();

    // Returns [date_trunc('day', created_at), SUM(total), COUNT(*)] for paid orders in range
    @Query(value = "SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0), COUNT(*) FROM orders WHERE status = 'PAID' AND created_at >= :start GROUP BY DATE(created_at) ORDER BY day", nativeQuery = true)
    List<Object[]> dailyRevenueAndOrdersSince(@Param("start") LocalDateTime start);

    // Returns [product_name, SUM(quantity * unit_price)] for top products
    @Query(value = "SELECT i.product_name, COALESCE(SUM(i.quantity * i.unit_price), 0) AS revenue FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.status = 'PAID' GROUP BY i.product_name ORDER BY revenue DESC LIMIT 5", nativeQuery = true)
    List<Object[]> topProductsByRevenue();
}
