package com.website.journey.backend.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * Central service for emitting WebSocket events.
 * All other services use this class — they never interact with SimpMessagingTemplate directly.
 *
 * All messages follow the envelope:
 *   { "type": "EVENT_TYPE", "timestamp": "ISO-8601", "payload": { ... } }
 */
@Slf4j
@Service
public class WebSocketEventService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // -------------------------------------------------------------------------
    // Topic 1: /topic/orders/{orderId}/status
    // -------------------------------------------------------------------------

    public void emitOrderStatusChanged(Long orderId, String status, String updatedAt) {
        Map<String, Object> payload = Map.of(
                "orderId", orderId,
                "status", status,
                "updatedAt", updatedAt
        );
        send("/topic/orders/" + orderId + "/status", "ORDER_STATUS_CHANGED", payload);
    }

    // -------------------------------------------------------------------------
    // Topic 2: /topic/inventory/stock-updated
    // -------------------------------------------------------------------------

    public void emitStockUpdated(Long productId, int availableStock) {
        Map<String, Object> payload = Map.of(
                "productId", productId,
                "availableStock", availableStock
        );
        send("/topic/inventory/stock-updated", "STOCK_UPDATED", payload);
    }

    // -------------------------------------------------------------------------
    // Topic 3: /topic/admin/notifications — sub-types
    // -------------------------------------------------------------------------

    public void emitNewOrder(Long orderId, BigDecimal total, String customerEmail) {
        Map<String, Object> payload = Map.of(
                "type", "NEW_ORDER",
                "orderId", orderId,
                "total", total,
                "customerEmail", customerEmail != null ? customerEmail : ""
        );
        send("/topic/admin/notifications", "NEW_ORDER", payload);
    }

    public void emitNewContactMessage(String name, String email, String subject) {
        Map<String, Object> payload = Map.of(
                "type", "NEW_CONTACT",
                "name", name,
                "email", email,
                "subject", subject != null ? subject : ""
        );
        send("/topic/admin/notifications", "NEW_CONTACT", payload);
    }

    public void emitNewRefundRequest(Long refundRequestId, Long orderId, String userEmail) {
        Map<String, Object> payload = Map.of(
                "type", "NEW_REFUND_REQUEST",
                "refundRequestId", refundRequestId,
                "orderId", orderId,
                "userEmail", userEmail != null ? userEmail : ""
        );
        send("/topic/admin/notifications", "NEW_REFUND_REQUEST", payload);
    }

    /**
     * Low-stock alert — emitted when a product's stock crosses the threshold (drops to ≤ 5).
     */
    public void emitLowStock(Long productId, String productName, int availableStock) {
        Map<String, Object> payload = Map.of(
                "type", "LOW_STOCK",
                "productId", productId,
                "productName", productName,
                "availableStock", availableStock
        );
        send("/topic/admin/notifications", "LOW_STOCK", payload);
    }

    // -------------------------------------------------------------------------
    // Topic 4: /topic/news/published
    // -------------------------------------------------------------------------

    public void emitBreakingNewsPublished(Long articleId, String title, String slug, String summary) {
        Map<String, Object> payload = Map.of(
                "articleId", articleId,
                "title", title,
                "slug", slug,
                "summary", summary != null ? summary : ""
        );
        send("/topic/news/published", "NEWS_PUBLISHED", payload);
    }

    // -------------------------------------------------------------------------
    // Topic 5: /topic/user/{userId}/notifications
    // -------------------------------------------------------------------------

    public void emitUserNotification(Long userId, Long notificationId, String message, String type, Long orderId) {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("notificationId", notificationId);
        payload.put("message", message);
        payload.put("type", type);
        if (orderId != null) payload.put("orderId", orderId);
        send("/topic/user/" + userId + "/notifications", "USER_NOTIFICATION", payload);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private void send(String destination, String type, Map<String, Object> payload) {
        try {
            Map<String, Object> envelope = Map.of(
                    "type", type,
                    "timestamp", Instant.now().toString(),
                    "payload", payload
            );
            messagingTemplate.convertAndSend(destination, envelope);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket event [{}] to [{}]: {}", type, destination, e.getMessage());
        }
    }
}
