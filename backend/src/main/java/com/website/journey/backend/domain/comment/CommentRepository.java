package com.website.journey.backend.domain.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtAsc(
            String targetType, Long targetId, CommentStatus status);

    Page<Comment> findByStatusOrderByCreatedAtDesc(CommentStatus status, Pageable pageable);

    Page<Comment> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
