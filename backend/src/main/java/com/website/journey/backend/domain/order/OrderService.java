package com.website.journey.backend.domain.order;

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

    public OrderService(OrderRepository orderRepository,
                        UserRepository userRepository,
                        ProductRepository productRepository,
                        SubscriptionService subscriptionService) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.subscriptionService = subscriptionService;
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
        }

        PlaceOrderRequest.ShippingAddress shipping = request.shippingAddress();

        Order order = Order.builder()
                .userId(userId)
                .status("PENDING")
                .total(request.total())
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
                        }
                    });
                }
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
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
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
