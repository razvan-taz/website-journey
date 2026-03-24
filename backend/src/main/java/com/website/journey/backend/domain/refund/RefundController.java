package com.website.journey.backend.domain.refund;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class RefundController {

    private final RefundService refundService;

    public RefundController(RefundService refundService) {
        this.refundService = refundService;
    }

    // -------------------------------------------------------------------------
    // User endpoint: submit a refund request for an order
    // -------------------------------------------------------------------------

    @PostMapping("/api/orders/{orderId}/refund-request")
    public ResponseEntity<RefundRequestDto> submitRefundRequest(
            @PathVariable Long orderId,
            @Valid @RequestBody CreateRefundRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(refundService.submitRefundRequestByEmail(orderId, auth.getName(), request));
    }

    // -------------------------------------------------------------------------
    // Admin endpoints
    // -------------------------------------------------------------------------

    @GetMapping("/api/admin/refunds")
    public ResponseEntity<Page<RefundRequestDto>> listRefunds(
            @RequestParam(required = false) RefundStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(refundService.findAll(status, PageRequest.of(page, size)));
    }

    @PostMapping("/api/admin/refunds/{id}/approve")
    public ResponseEntity<RefundRequestDto> approveRefund(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth != null ? auth.getName() : "admin";
        return ResponseEntity.ok(refundService.approve(id, adminUsername));
    }

    @PostMapping("/api/admin/refunds/{id}/reject")
    public ResponseEntity<RefundRequestDto> rejectRefund(
            @PathVariable Long id,
            @Valid @RequestBody RejectRefundRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String adminUsername = auth != null ? auth.getName() : "admin";
        return ResponseEntity.ok(refundService.reject(id, adminUsername, request));
    }
}
