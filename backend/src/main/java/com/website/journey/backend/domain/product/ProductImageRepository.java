package com.website.journey.backend.domain.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findAllByProductIdOrderByDisplayOrderAsc(Long productId);

    long countByProductId(Long productId);

    @Query("SELECT MAX(pi.displayOrder) FROM ProductImage pi WHERE pi.product.id = :productId")
    Optional<Integer> findMaxDisplayOrderByProductId(@Param("productId") Long productId);

    Optional<ProductImage> findByIdAndProductId(Long id, Long productId);
}
