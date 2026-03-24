package com.website.journey.backend.domain.cart;

import com.website.journey.backend.domain.product.Product;
import com.website.journey.backend.domain.product.ProductRepository;
import com.website.journey.backend.domain.user.EmailNotVerifiedException;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public CartService(CartRepository cartRepository,
                       ProductRepository productRepository,
                       UserRepository userRepository) {
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    public Long resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getId();
    }

    @Transactional
    public Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart newCart = Cart.builder()
                    .userId(userId)
                    .build();
            return cartRepository.save(newCart);
        });
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        Cart cart = cartRepository.findByUserId(userId).orElse(null);
        if (cart == null) {
            return new CartResponse(List.of(), 0, BigDecimal.ZERO);
        }
        return buildCartResponse(cart);
    }

    private void checkEmailVerified(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            if (!user.isEmailVerified()) {
                throw new EmailNotVerifiedException("Please verify your email to use the cart");
            }
        });
    }

    @Transactional
    public CartResponse addItem(Long userId, Long productId, Integer quantity) {
        checkEmailVerified(userId);
        Cart cart = getOrCreateCart(userId);

        Optional<CartItem> existing = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();

        if (existing.isPresent()) {
            existing.get().setQuantity(existing.get().getQuantity() + quantity);
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productId(productId)
                    .quantity(quantity)
                    .build();
            cart.getItems().add(newItem);
        }

        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(Long userId, Long productId, Integer quantity) {
        if (quantity <= 0) {
            return removeItem(userId, productId);
        }

        checkEmailVerified(userId);
        Cart cart = getOrCreateCart(userId);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found in cart"));

        item.setQuantity(quantity);
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long productId) {
        Cart cart = getOrCreateCart(userId);
        cart.getItems().removeIf(item -> item.getProductId().equals(productId));
        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    @Transactional
    public CartResponse mergeCart(Long userId, List<MergeCartRequest.MergeItem> guestItems) {
        Cart cart = getOrCreateCart(userId);

        for (MergeCartRequest.MergeItem guestItem : guestItems) {
            Optional<CartItem> existing = cart.getItems().stream()
                    .filter(item -> item.getProductId().equals(guestItem.productId()))
                    .findFirst();

            if (existing.isPresent()) {
                existing.get().setQuantity(existing.get().getQuantity() + guestItem.quantity());
            } else {
                CartItem newItem = CartItem.builder()
                        .cart(cart)
                        .productId(guestItem.productId())
                        .quantity(guestItem.quantity())
                        .build();
                cart.getItems().add(newItem);
            }
        }

        cartRepository.save(cart);
        return buildCartResponse(cart);
    }

    private CartResponse buildCartResponse(Cart cart) {
        List<Long> productIds = cart.getItems().stream()
                .map(CartItem::getProductId)
                .toList();

        Map<Long, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .filter(item -> productMap.containsKey(item.getProductId()))
                .map(item -> {
                    Product product = productMap.get(item.getProductId());
                    return new CartItemResponse(
                            product.getId(),
                            product.getName(),
                            product.getPrice(),
                            product.getImageUrl(),
                            item.getQuantity()
                    );
                })
                .toList();

        int itemCount = itemResponses.stream().mapToInt(CartItemResponse::quantity).sum();

        BigDecimal subtotal = itemResponses.stream()
                .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(itemResponses, itemCount, subtotal);
    }
}
