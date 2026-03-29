package com.website.journey.backend.domain.comment;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    // --- Public: get approved comments ---

    @GetMapping("/api/articles/{slug}/comments")
    public ResponseEntity<List<CommentDto>> getArticleComments(@PathVariable Long slug) {
        return ResponseEntity.ok(commentService.getApprovedComments("ARTICLE", slug));
    }

    @GetMapping("/api/articles/id/{articleId}/comments")
    public ResponseEntity<List<CommentDto>> getArticleCommentsById(@PathVariable Long articleId) {
        return ResponseEntity.ok(commentService.getApprovedComments("ARTICLE", articleId));
    }

    @GetMapping("/api/products/{productId}/comments")
    public ResponseEntity<List<CommentDto>> getProductComments(@PathVariable Long productId) {
        return ResponseEntity.ok(commentService.getApprovedComments("PRODUCT", productId));
    }

    // --- Authenticated: post and edit ---

    @PostMapping("/api/articles/id/{articleId}/comments")
    public ResponseEntity<CommentDto> addArticleComment(
            @PathVariable Long articleId,
            @Valid @RequestBody CreateCommentRequest request) {
        String email = requireAuth();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment("ARTICLE", articleId, email, request));
    }

    @PostMapping("/api/products/{productId}/comments")
    public ResponseEntity<CommentDto> addProductComment(
            @PathVariable Long productId,
            @Valid @RequestBody CreateCommentRequest request) {
        String email = requireAuth();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment("PRODUCT", productId, email, request));
    }

    @PutMapping("/api/comments/{commentId}")
    public ResponseEntity<CommentDto> editComment(
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentContentRequest request) {
        String email = requireAuth();
        return ResponseEntity.ok(commentService.editComment(commentId, email, request));
    }

    @DeleteMapping("/api/comments/{commentId}")
    public ResponseEntity<Void> deleteOwn(@PathVariable Long commentId) {
        String email = requireAuth();
        commentService.deleteOwn(commentId, email);
        return ResponseEntity.noContent().build();
    }

    // --- Admin ---

    @GetMapping("/api/admin/comments")
    public ResponseEntity<Page<CommentDto>> listComments(
            @RequestParam(required = false) CommentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(commentService.findAllAdmin(status, PageRequest.of(page, size)));
    }

    @PostMapping("/api/admin/comments/{id}/approve")
    public ResponseEntity<CommentDto> approve(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.approve(id));
    }

    @PostMapping("/api/admin/comments/{id}/reject")
    public ResponseEntity<CommentDto> reject(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.reject(id));
    }

    @DeleteMapping("/api/admin/comments/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        commentService.deleteAdmin(id);
        return ResponseEntity.noContent().build();
    }

    private String requireAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return auth.getName();
    }
}
