package com.website.journey.backend.domain.coupon;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCodeIgnoreCase(String code);

    @Query("SELECT COUNT(u) FROM CouponUsage u WHERE u.coupon.id = :couponId")
    long countUsages(Long couponId);
}
