package com.website.journey.backend.domain.product;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findAllByActiveTrue(Pageable pageable);

    Page<Product> findAllByActiveTrueAndCategoryIgnoreCase(String category, Pageable pageable);

    Optional<Product> findByIdAndActiveTrue(Long id);

    List<Product> findAllByCategoryAndActiveTrueOrderByPriceAsc(String category);

    @Query("SELECT p FROM Product p WHERE p.active = true AND (" +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.category) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Product> searchByQuery(@Param("query") String query, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.active = true " +
           "AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND (:category IS NULL OR LOWER(p.category) = LOWER(:category))")
    Page<Product> searchByQueryAndCategory(@Param("q") String q, @Param("category") String category, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.active = true " +
           "AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND (:category IS NULL OR LOWER(p.category) = LOWER(:category)) " +
           "AND (:inStock IS NULL OR (:inStock = true AND p.stock > 0))")
    Page<Product> findAllWithFilters(@Param("q") String q, @Param("category") String category, @Param("inStock") Boolean inStock, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") Long id);
}
