package com.website.journey.backend.domain.order;

import com.stripe.exception.StripeException;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import com.website.journey.backend.config.EmailService;
import com.website.journey.backend.domain.coupon.CouponService;
import com.website.journey.backend.domain.coupon.CouponValidationRequest;
import com.website.journey.backend.domain.coupon.CouponValidationResult;
import com.website.journey.backend.domain.coupon.CouponValidationService;
import com.website.journey.backend.domain.discount.DiscountCodeRepository;
import com.website.journey.backend.domain.notification.NotificationService;
import com.website.journey.backend.domain.product.ProductRepository;
import com.website.journey.backend.domain.shipping.ShippingConfigService;
import com.website.journey.backend.domain.user.UserRepository;
import com.website.journey.backend.websocket.WebSocketEventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OrderService {

    private static final int LOW_STOCK_THRESHOLD = 5;

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final EmailService emailService;
    private final DiscountCodeRepository discountCodeRepository;
    private final WebSocketEventService webSocketEventService;
    private final NotificationService notificationService;
    private final CouponService couponService;
    private final CouponValidationService couponValidationService;
    private final ShippingConfigService shippingConfigService;

    public OrderService(OrderRepository orderRepository,
                        UserRepository userRepository,
                        ProductRepository productRepository,
                        EmailService emailService,
                        DiscountCodeRepository discountCodeRepository,
                        WebSocketEventService webSocketEventService,
                        NotificationService notificationService,
                        CouponService couponService,
                        CouponValidationService couponValidationService,
                        ShippingConfigService shippingConfigService) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.emailService = emailService;
        this.discountCodeRepository = discountCodeRepository;
        this.webSocketEventService = webSocketEventService;
        this.notificationService = notificationService;
        this.couponService = couponService;
        this.couponValidationService = couponValidationService;
        this.shippingConfigService = shippingConfigService;
    }

    @Transactional
    public OrderConfirmationResponse placeOrder(PlaceOrderRequest request, Long userId) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order must contain at least one item");
        }

        for (PlaceOrderRequest.OrderItemRequest item : request.items()) {
            if (item.quantity() == null || item.quantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Item quantity must be greater than zero: " + item.name());
            }
            if (item.price() == null || item.price().compareTo(BigDecimal.ZERO) <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Item price must be greater than zero: " + item.name());
            }
            if (item.productId() != null) {
                productRepository.findByIdWithLock(item.productId()).ifPresent(product -> {
                    if (product.getStock() < item.quantity()) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "Insufficient stock for: " + item.name());
                    }
                });
            }
        }

        PlaceOrderRequest.ShippingAddress shipping = request.shippingAddress();

        BigDecimal discountAmount = computeDiscountServerSide(request, userId);
        // SH-003-01: shipping amount is always fetched server-side from ShippingConfig — client value is ignored
        BigDecimal shippingAmount = shippingConfigService.getConfig().getPrice();

        // Increment legacy discount code usage if provided
        if (request.discountCode() != null && !request.discountCode().isBlank()) {
            discountCodeRepository.findByCodeIgnoreCase(request.discountCode()).ifPresent(dc -> {
                dc.setUses(dc.getUses() + 1);
                discountCodeRepository.save(dc);
            });
        }

        Order order = Order.builder()
                .userId(userId)
                .status("PENDING")
                .total(request.total())
                .paymentIntentId(request.paymentIntentId())
                .discountCode(request.discountCode() != null ? request.discountCode().toUpperCase() : null)
                .discountAmount(discountAmount)
                .shippingAmount(shippingAmount)
                .shippingName(shipping.name())
                .shippingLine1(shipping.line1())
                .shippingCity(shipping.city())
                .shippingState(shipping.state())
                .shippingZip(shipping.zip())
                .shippingCountry(shipping.country() != null ? shipping.country() : "US")
                .build();

        List<OrderItem> items = request.items().stream()
                .map(itemRequest -> OrderItem.builder()
                        .order(order)
                        .productId(itemRequest.productId())
                        .productName(itemRequest.name())
                        .unitPrice(itemRequest.price())
                        .quantity(itemRequest.quantity())
                        .build())
                .toList();

        order.setItems(items);

        Order saved = orderRepository.save(order);

        // Record coupon usage for the new coupon system if applicable
        if (request.discountCode() != null && !request.discountCode().isBlank() && userId != null) {
            try {
                couponService.recordUsage(request.discountCode(), userId, saved.getId());
            } catch (Exception e) {
                log.warn("Failed to record coupon usage for order {} (code={}): {}",
                        saved.getId(), request.discountCode(), e.getMessage());
            }
        }

        // Determine customer email for admin notification
        final String[] customerEmail = {""};

        if (userId != null) {
            saved.getItems().forEach(item -> {
                if (item.getProductId() != null) {
                    productRepository.findByIdWithLock(item.getProductId()).ifPresent(product -> {
                        int previousStock = product.getStock();
                        if (previousStock < item.getQuantity()) {
                            throw new ResponseStatusException(HttpStatus.CONFLICT,
                                    "Insufficient stock for: " + item.getProductName());
                        }
                        int newStock = previousStock - item.getQuantity();
                        product.setStock(newStock);
                        productRepository.save(product);

                        // Emit stock-updated event
                        webSocketEventService.emitStockUpdated(product.getId(), newStock);

                        // Emit low-stock alert only when stock crosses the threshold
                        // (was above threshold before, now at or below it)
                        if (previousStock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD) {
                            webSocketEventService.emitLowStock(product.getId(), product.getName(), newStock);
                        }
                    });
                }
            });

            userRepository.findById(userId).ifPresent(user -> {
                customerEmail[0] = user.getEmail();
                List<EmailService.OrderItemDetail> emailItems = saved.getItems().stream()
                        .map(item -> new EmailService.OrderItemDetail(
                                item.getProductName(),
                                item.getQuantity(),
                                item.getUnitPrice()))
                        .toList();
                emailService.sendOrderConfirmation(
                        user.getEmail(),
                        user.getName(),
                        String.valueOf(saved.getId()),
                        emailItems,
                        saved.getTotal(),
                        saved.getShippingName());
            });
        }

        // Emit new order placed notification to admin
        webSocketEventService.emitNewOrder(saved.getId(), saved.getTotal(), customerEmail[0]);

        // Notify user
        if (userId != null) {
            notificationService.createForUser(userId,
                    "Your order #" + saved.getId() + " has been placed successfully.",
                    "ORDER_PLACED", saved.getId());
        }

        return new OrderConfirmationResponse(
                saved.getId(),
                saved.getStatus(),
                saved.getTotal(),
                saved.getShippingAmount(),
                saved.getCreatedAt().toString()
        );
    }

    @Transactional
    public void updateOrderStatus(Long orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found: " + orderId));
        order.setStatus(newStatus);
        Order saved = orderRepository.save(order);
        webSocketEventService.emitOrderStatusChanged(saved.getId(), saved.getStatus(), saved.getUpdatedAt().toString());

        // Notify the order owner
        if (saved.getUserId() != null) {
            notificationService.createForUser(saved.getUserId(),
                    "Your order #" + saved.getId() + " status has been updated to: " + saved.getStatus() + ".",
                    "ORDER_STATUS_CHANGED", saved.getId());
        }
    }

    @Transactional(readOnly = true)
    public List<OrderHistoryResponse> getOrderHistory(Long userId) {
        return orderRepository.findByUserIdWithItemsOrderByCreatedAtDesc(userId)
                .stream()
                .map(order -> new OrderHistoryResponse(
                        order.getId(),
                        order.getStatus(),
                        order.getTotal(),
                        order.getCreatedAt().toString(),
                        order.getItems().stream()
                                .map(item -> new OrderHistoryResponse.OrderItemSummary(
                                        item.getProductName(),
                                        item.getUnitPrice(),
                                        item.getQuantity()
                                ))
                                .toList()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getOrderDetail(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!userId.equals(order.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return new OrderDetailResponse(
                order.getId(),
                order.getStatus(),
                order.getTotal(),
                order.getDiscountAmount(),
                order.getDiscountCode(),
                order.getShippingAmount(),
                order.getCreatedAt() != null ? order.getCreatedAt().toString() : null,
                order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null,
                new OrderDetailResponse.ShippingAddress(
                        order.getShippingName(),
                        order.getShippingLine1(),
                        order.getShippingCity(),
                        order.getShippingState(),
                        order.getShippingZip(),
                        order.getShippingCountry()
                ),
                order.getItems().stream()
                        .map(item -> new OrderHistoryResponse.OrderItemSummary(
                                item.getProductName(),
                                item.getUnitPrice(),
                                item.getQuantity()
                        ))
                        .toList()
        );
    }

    public Long resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getId();
    }

    private static final Set<String> ADMIN_ALLOWED_STATUSES = Set.of("PROCESSING", "SHIPPED", "DELIVERED");

    @Transactional(readOnly = true)
    public Page<AdminOrderDto> findAllOrdersAdmin(String status, Pageable pageable) {
        Page<Order> orders = (status != null && !status.isBlank())
                ? orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                : orderRepository.findAllByOrderByCreatedAtDesc(pageable);

        // Batch-fetch all user emails for this page in one query instead of N individual lookups
        List<Long> userIds = orders.stream()
                .map(Order::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, String> emailByUserId = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getEmail()));

        return orders.map(order -> toAdminOrderDto(order, emailByUserId));
    }

    @Transactional
    public void updateOrderStatusAdmin(Long orderId, String newStatus) {
        if (!ADMIN_ALLOWED_STATUSES.contains(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid status. Allowed values: PROCESSING, SHIPPED, DELIVERED");
        }
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found: " + orderId));
        order.setStatus(newStatus);
        Order saved = orderRepository.save(order);
        webSocketEventService.emitOrderStatusChanged(saved.getId(), saved.getStatus(), saved.getUpdatedAt().toString());
    }

    @Transactional
    public void bulkUpdateOrderStatusAdmin(java.util.List<Long> orderIds, String newStatus) {
        if (!ADMIN_ALLOWED_STATUSES.contains(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid status. Allowed values: PROCESSING, SHIPPED, DELIVERED");
        }
        java.util.List<Order> orders = orderRepository.findAllById(orderIds);
        for (Order order : orders) {
            order.setStatus(newStatus);
        }
        orderRepository.saveAll(orders);
    }

    @Transactional
    public OrderDetailResponse cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!userId.equals(order.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String currentStatus = order.getStatus();
        if (!"PENDING".equals(currentStatus) && !"PROCESSING".equals(currentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Order cannot be cancelled in its current status.");
        }

        if ("PROCESSING".equals(currentStatus) && order.getPaymentIntentId() != null) {
            try {
                RefundCreateParams params = RefundCreateParams.builder()
                        .setPaymentIntent(order.getPaymentIntentId())
                        .build();
                Refund.create(params);
                log.info("Stripe refund issued for order {} (paymentIntentId={})",
                        orderId, order.getPaymentIntentId());
            } catch (StripeException e) {
                log.warn("Stripe refund failed for order {} (paymentIntentId={}): {}",
                        orderId, order.getPaymentIntentId(), e.getMessage());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Refund could not be processed. Please contact support.");
            }
        }

        order.setStatus("CANCELLED");
        Order saved = orderRepository.save(order);

        webSocketEventService.emitOrderStatusChanged(saved.getId(), saved.getStatus(),
                saved.getUpdatedAt().toString());

        notificationService.createForUser(userId,
                "Your order #" + saved.getId() + " has been cancelled.",
                "ORDER_CANCELLED", saved.getId());

        userRepository.findById(userId).ifPresent(user -> emailService.sendOrderCancellation(
                user.getEmail(),
                user.getName(),
                String.valueOf(saved.getId()),
                saved.getTotal()));

        return new OrderDetailResponse(
                saved.getId(),
                saved.getStatus(),
                saved.getTotal(),
                saved.getDiscountAmount(),
                saved.getDiscountCode(),
                saved.getShippingAmount(),
                saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null,
                saved.getUpdatedAt() != null ? saved.getUpdatedAt().toString() : null,
                new OrderDetailResponse.ShippingAddress(
                        saved.getShippingName(),
                        saved.getShippingLine1(),
                        saved.getShippingCity(),
                        saved.getShippingState(),
                        saved.getShippingZip(),
                        saved.getShippingCountry()
                ),
                saved.getItems().stream()
                        .map(item -> new OrderHistoryResponse.OrderItemSummary(
                                item.getProductName(),
                                item.getUnitPrice(),
                                item.getQuantity()
                        ))
                        .toList()
        );
    }

    private BigDecimal computeDiscountServerSide(PlaceOrderRequest request, Long userId) {
        if (request.discountCode() == null || request.discountCode().isBlank()) {
            return BigDecimal.ZERO;
        }
        // Batch-load product categories for new-system coupon validation
        List<Long> productIds = request.items().stream()
                .map(PlaceOrderRequest.OrderItemRequest::productId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, String> categoryById = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(p -> p.getId(),
                        p -> p.getCategory() != null ? p.getCategory() : ""));
        List<CouponValidationRequest.CartItemDto> cartItems = request.items().stream()
                .map(item -> new CouponValidationRequest.CartItemDto(
                        item.productId(),
                        item.productId() != null ? categoryById.getOrDefault(item.productId(), "") : "",
                        item.quantity(),
                        item.price()
                ))
                .toList();
        CouponValidationResult result = couponValidationService.validate(request.discountCode(), userId, cartItems);
        if (result.valid()) {
            return result.discountAmount() != null ? result.discountAmount() : BigDecimal.ZERO;
        }
        // Fall back to legacy discount code
        return discountCodeRepository.findByCodeIgnoreCase(request.discountCode())
                .filter(dc -> Boolean.TRUE.equals(dc.getActive()))
                .filter(dc -> dc.getExpiresAt() == null || dc.getExpiresAt().isAfter(LocalDateTime.now()))
                .filter(dc -> dc.getMaxUses() == null || dc.getUses() < dc.getMaxUses())
                .map(dc -> {
                    BigDecimal subtotal = request.items().stream()
                            .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    if ("PERCENT".equalsIgnoreCase(dc.getDiscountType())) {
                        return subtotal
                                .multiply(dc.getDiscountValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                                .setScale(2, RoundingMode.HALF_UP);
                    }
                    return dc.getDiscountValue().min(subtotal).max(BigDecimal.ZERO);
                })
                .orElse(BigDecimal.ZERO);
    }

    private AdminOrderDto toAdminOrderDto(Order order, Map<Long, String> emailByUserId) {
        String customerEmail = order.getUserId() != null
                ? emailByUserId.getOrDefault(order.getUserId(), "unknown")
                : "guest";
        int itemCount = order.getItems().stream().mapToInt(i -> i.getQuantity()).sum();
        return new AdminOrderDto(
                order.getId(),
                customerEmail,
                itemCount,
                order.getTotal(),
                order.getStatus(),
                order.getPaymentIntentId(),
                order.getCreatedAt() != null ? order.getCreatedAt().toString() : null
        );
    }
}
