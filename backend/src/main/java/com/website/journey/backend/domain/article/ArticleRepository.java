package com.website.journey.backend.domain.article;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {

    Optional<Article> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Article> findTop4ByTagAndSlugNotOrderByPublishDateDesc(String tag, String slug);

    Page<Article> findByTagIgnoreCase(String tag, Pageable pageable);

    @Query("SELECT DISTINCT a.tag FROM Article a WHERE a.tag IS NOT NULL ORDER BY a.tag")
    List<String> findDistinctTags();

    @Query("SELECT a FROM Article a WHERE " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.tag) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Article> searchByQuery(@Param("query") String query, Pageable pageable);
}
