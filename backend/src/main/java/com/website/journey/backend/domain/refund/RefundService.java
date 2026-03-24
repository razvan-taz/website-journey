package com.website.journey.backend.domain.refund;

import com.stripe.exception.StripeException;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import com.website.journey.backend.config.EmailService;
import com.website.journey.backend.domain.notification.NotificationService;
import com.website.journey.backend.domain.order.Order;
import com.website.journey.backend.domain.order.OrderRepository;
import com.website.journey.backend.domain.order.OrderService;
import com.website.journey.backend.domain.user.User;
import com.website.journey.backend.domain.user.UserRepository;
import com.website.journey.backend.websocket.WebSocketEventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class RefundService {

    private final RefundRequestRepository refundRequestRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final EmailService emailService;
    private final WebSocketEventService webSocketEventService;
    private final NotificationService notificationService;

    public RefundService(RefundRequestRepository refundRequestRepository,
                         OrderRepository orderRepository,
                         UserRepository userRepository,
                         OrderService orderService,
                         EmailService emailService,
                         WebSocketEventService webSocketEventService,
                         NotificationService notificationService) {
        this.refundRequestRepository = refundRequestRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.emailService = emailService;
        this.webSocketEventService = webSocketEventService;
        this.notificationService = notificationService;
    }

    @Transactional
    public RefundRequestDto submitRefundRequestByEmail(Long orderId, String userEmail, CreateRefundRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return submitRefundRequest(orderId, user.getId(), request);
    }

    @Transactional
    public RefundRequestDto submitRefundRequest(Long orderId, Long userId, CreateRefundRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        // Validate the order belongs to this user
        if (!userId.equals(order.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to this user");
        }

        // Only allow refund requests for PAID or DELIVERED orders
        if (!"PAID".equals(order.getStatus()) && !"DELIVERED".equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Refund can only be requested for paid or delivered orders");
        }

        // Check for existing pending or approved refund request
        refundRequestRepository.findByOrderIdAndStatusIn(orderId,
                List.of(RefundStatus.PENDING, RefundStatus.APPROVED)).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A refund request already exists for this order");
        });

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        RefundRequest refundRequest = RefundRequest.builder()
                .order(order)
                .user(user)
                .reason(request.reason())
                .status(RefundStatus.PENDING)
                .build();

        RefundRequest saved = refundRequestRepository.save(refundRequest);

        // Notify admin via WebSocket
        webSocketEventService.emitNewRefundRequest(saved.getId(), orderId, user.getEmail());

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public Page<RefundRequestDto> findAll(RefundStatus status, Pageable pageable) {
        Page<RefundRequest> page = status != null
                ? refundRequestRepository.findByStatus(status, pageable)
                : refundRequestRepository.findAll(pageable);
        return page.map(this::toDto);
    }

    @Transactional
    public RefundRequestDto approve(Long refundRequestId, String adminUsername) {
        RefundRequest refundReq = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Refund request not found"));

        if (refundReq.getStatus() != RefundStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only PENDING refund requests can be approved");
        }

        Order order = refundReq.getOrder();

        // Issue Stripe refund
        String stripeRefundId = null;
        if (order.getPaymentIntentId() != null && !order.getPaymentIntentId().isBlank()) {
            try {
                RefundCreateParams params = RefundCreateParams.builder()
                        .setPaymentIntent(order.getPaymentIntentId())
                        .build();
                Refund stripeRefund = Refund.create(params);
                stripeRefundId = stripeRefund.getId();
                log.info("Stripe refund {} created for order {}", stripeRefundId, order.getId());
            } catch (StripeException e) {
                log.warn("Stripe refund failed for order {}: {}", order.getId(), e.getMessage());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Failed to process refund with payment provider: " + e.getMessage());
            }
        }

        refundReq.setStatus(RefundStatus.APPROVED);
        refundReq.setProcessedAt(LocalDateTime.now());
        refundReq.setProcessedBy(adminUsername);
        refundReq.setStripeRefundId(stripeRefundId);
        refundRequestRepository.save(refundReq);

        // Update order status to REFUNDED (also emits WebSocket order status event)
        orderService.updateOrderStatus(order.getId(), "REFUNDED");

        // Send confirmation email to user
        if (refundReq.getUser() != null) {
            emailService.sendRefundApprovedEmail(
                    refundReq.getUser().getEmail(),
                    refundReq.getUser().getName(),
                    String.valueOf(order.getId()),
                    order.getTotal()
            );
            notificationService.createForUser(refundReq.getUser().getId(),
                    "Your refund request for order #" + order.getId() + " has been approved.",
                    "REFUND_APPROVED", order.getId());
        }

        return toDto(refundReq);
    }

    @Transactional
    public RefundRequestDto reject(Long refundRequestId, String adminUsername, RejectRefundRequest request) {
        RefundRequest refundReq = refundRequestRepository.findById(refundRequestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Refund request not found"));

        if (refundReq.getStatus() != RefundStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only PENDING refund requests can be rejected");
        }

        refundReq.setStatus(RefundStatus.REJECTED);
        refundReq.setProcessedAt(LocalDateTime.now());
        refundReq.setProcessedBy(adminUsername);
        refundRequestRepository.save(refundReq);

        // Send rejection email to user
        if (refundReq.getUser() != null) {
            emailService.sendRefundRejectedEmail(
                    refundReq.getUser().getEmail(),
                    refundReq.getUser().getName(),
                    String.valueOf(refundReq.getOrder().getId()),
                    request.reason()
            );
            notificationService.createForUser(refundReq.getUser().getId(),
                    "Your refund request for order #" + refundReq.getOrder().getId() + " has been rejected.",
                    "REFUND_REJECTED", refundReq.getOrder().getId());
        }

        return toDto(refundReq);
    }

    private RefundRequestDto toDto(RefundRequest refundReq) {
        String userEmail = refundReq.getUser() != null ? refundReq.getUser().getEmail() : null;
        return new RefundRequestDto(
                refundReq.getId(),
                refundReq.getOrder().getId(),
                refundReq.getOrder().getTotal(),
                userEmail,
                refundReq.getReason(),
                refundReq.getStatus(),
                refundReq.getRequestedAt(),
                refundReq.getProcessedAt(),
                refundReq.getProcessedBy(),
                refundReq.getStripeRefundId()
        );
    }
}
