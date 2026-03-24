package com.website.journey.backend.domain.order;

import com.website.journey.backend.config.EmailService;
import com.website.journey.backend.domain.discount.DiscountCodeRepository;
import com.website.journey.backend.domain.notification.NotificationService;
import com.website.journey.backend.domain.product.ProductRepository;
import com.website.journey.backend.domain.user.UserRepository;
import com.website.journey.backend.websocket.WebSocketEventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

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

    public OrderService(OrderRepository orderRepository,
                        UserRepository userRepository,
                        ProductRepository productRepository,
                        EmailService emailService,
                        DiscountCodeRepository discountCodeRepository,
                        WebSocketEventService webSocketEventService,
                        NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.emailService = emailService;
        this.discountCodeRepository = discountCodeRepository;
        this.webSocketEventService = webSocketEventService;
        this.notificationService = notificationService;
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
                productRepository.findById(item.productId()).ifPresent(product -> {
                    if (product.getStock() < item.quantity()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Insufficient stock for: " + item.name());
                    }
                });
            }
        }

        PlaceOrderRequest.ShippingAddress shipping = request.shippingAddress();

        BigDecimal discountAmount = request.discountAmount() != null ? request.discountAmount() : BigDecimal.ZERO;

        // Increment discount code usage if provided
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
                .discountCode(request.discountCode())
                .discountAmount(discountAmount)
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

        // Determine customer email for admin notification
        final String[] customerEmail = {""};

        if (userId != null) {
            saved.getItems().forEach(item -> {
                if (item.getProductId() != null) {
                    productRepository.findById(item.getProductId()).ifPresent(product -> {
                        int previousStock = product.getStock();
                        int newStock = Math.max(0, previousStock - item.getQuantity());
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

        if (!order.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return new OrderDetailResponse(
                order.getId(),
                order.getStatus(),
                order.getTotal(),
                order.getDiscountAmount(),
                order.getDiscountCode(),
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

        return orders.map(this::toAdminOrderDto);
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

    private AdminOrderDto toAdminOrderDto(Order order) {
        String customerEmail = order.getUserId() != null
                ? userRepository.findById(order.getUserId())
                        .map(u -> u.getEmail())
                        .orElse("unknown")
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
