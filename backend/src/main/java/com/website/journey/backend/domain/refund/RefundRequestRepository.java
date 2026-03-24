package com.website.journey.backend.domain.refund;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    Page<RefundRequest> findByStatus(RefundStatus status, Pageable pageable);

    Optional<RefundRequest> findByOrderIdAndStatusIn(Long orderId, java.util.List<RefundStatus> statuses);
}
