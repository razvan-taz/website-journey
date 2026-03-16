package com.website.journey.backend.domain.order;

import com.website.journey.backend.config.EmailService;
import com.website.journey.backend.domain.discount.DiscountCodeRepository;
import com.website.journey.backend.domain.product.ProductRepository;
import com.website.journey.backend.domain.subscription.SubscriptionService;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final SubscriptionService subscriptionService;
    private final EmailService emailService;
    private final DiscountCodeRepository discountCodeRepository;

    public OrderService(OrderRepository orderRepository,
                        UserRepository userRepository,
                        ProductRepository productRepository,
                        SubscriptionService subscriptionService,
                        EmailService emailService,
                        DiscountCodeRepository discountCodeRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.subscriptionService = subscriptionService;
        this.emailService = emailService;
        this.discountCodeRepository = discountCodeRepository;
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
                    if (!"Subscription".equals(product.getCategory()) && product.getStock() < item.quantity()) {
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

        if (userId != null) {
            saved.getItems().forEach(item -> {
                if (item.getProductId() != null) {
                    productRepository.findById(item.getProductId()).ifPresent(product -> {
                        if ("Subscription".equals(product.getCategory())) {
                            String billingPeriod = product.getName().toLowerCase().contains("monthly")
                                    ? "monthly"
                                    : "annual";
                            subscriptionService.createSubscription(
                                    userId, product.getId(), product.getName(), billingPeriod);
                        } else {
                            int newStock = Math.max(0, product.getStock() - item.getQuantity());
                            product.setStock(newStock);
                            productRepository.save(product);
                        }
                    });
                }
            });

            userRepository.findById(userId).ifPresent(user -> {
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

        return new OrderConfirmationResponse(
                saved.getId(),
                saved.getStatus(),
                saved.getTotal(),
                saved.getCreatedAt().toString()
        );
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

    public Long resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getId();
    }
}
