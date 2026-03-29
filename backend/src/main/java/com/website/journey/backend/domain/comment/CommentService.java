package com.website.journey.backend.domain.comment;

import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public CommentService(CommentRepository commentRepository,
                          UserRepository userRepository,
                          OrderRepository orderRepository) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public List<CommentDto> getApprovedComments(String targetType, Long targetId) {
        return commentRepository
                .findByTargetTypeAndTargetIdAndStatusOrderByCreatedAtAsc(targetType, targetId, CommentStatus.APPROVED)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CommentDto addComment(String targetType, Long targetId, String userEmail, CreateCommentRequest request) {
        var user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if ("PRODUCT".equals(targetType)) {
            boolean hasPurchased = orderRepository.existsPaidOrderWithProduct(user.getId(), targetId);
            if (!hasPurchased) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "You must purchase this product before leaving a comment");
            }
        }

        Comment comment = Comment.builder()
                .content(request.content())
                .authorId(user.getId())
                .authorName(user.getName())
                .targetType(targetType)
                .targetId(targetId)
                .status(CommentStatus.PENDING)
                .build();

        return toDto(commentRepository.save(comment));
    }

    @Transactional
    public CommentDto editComment(Long commentId, String userEmail, UpdateCommentContentRequest request) {
        var user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));

        if (!comment.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only edit your own comments");
        }

        comment.setContent(request.content());
        // Reset to PENDING after edit so it goes through moderation again
        comment.setStatus(CommentStatus.PENDING);

        return toDto(commentRepository.save(comment));
    }

    @Transactional
    public void deleteOwn(Long commentId, String userEmail) {
        var user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));

        if (!comment.getAuthorId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own comments");
        }

        commentRepository.deleteById(commentId);
    }

    // --- Admin methods ---

    @Transactional(readOnly = true)
    public Page<CommentDto> findAllAdmin(CommentStatus status, Pageable pageable) {
        if (status != null) {
            return commentRepository.findByStatusOrderByCreatedAtDesc(status, pageable).map(this::toDto);
        }
        return commentRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Transactional
    public CommentDto approve(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        comment.setStatus(CommentStatus.APPROVED);
        return toDto(commentRepository.save(comment));
    }

    @Transactional
    public CommentDto reject(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
        comment.setStatus(CommentStatus.REJECTED);
        return toDto(commentRepository.save(comment));
    }

    @Transactional
    public void deleteAdmin(Long commentId) {
        if (!commentRepository.existsById(commentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        commentRepository.deleteById(commentId);
    }

    private CommentDto toDto(Comment comment) {
        return new CommentDto(
                comment.getId(),
                comment.getContent(),
                comment.getAuthorId(),
                comment.getAuthorName(),
                comment.getTargetType(),
                comment.getTargetId(),
                comment.getStatus(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
