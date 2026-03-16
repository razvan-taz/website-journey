package com.website.journey.backend.domain.wishlist;

import com.website.journey.backend.domain.product.Product;
import com.website.journey.backend.domain.product.ProductRepository;
import com.website.journey.backend.domain.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class WishlistService {

    private final WishlistItemRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public WishlistService(WishlistItemRepository wishlistRepository,
                           ProductRepository productRepository,
                           UserRepository userRepository) {
        this.wishlistRepository = wishlistRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WishlistResponse> getWishlist(Long userId) {
        return wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(item -> productRepository.findById(item.getProductId())
                        .map(this::toResponse)
                        .orElse(null))
                .filter(r -> r != null)
                .toList();
    }

    @Transactional
    public void addToWishlist(Long userId, Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)) {
            return; // already wishlisted — idempotent
        }
        wishlistRepository.save(WishlistItem.builder()
                .userId(userId)
                .productId(productId)
                .build());
    }

    @Transactional
    public void removeFromWishlist(Long userId, Long productId) {
        wishlistRepository.deleteByUserIdAndProductId(userId, productId);
    }

    @Transactional(readOnly = true)
    public boolean isWishlisted(Long userId, Long productId) {
        return wishlistRepository.existsByUserIdAndProductId(userId, productId);
    }

    public Long resolveUserId(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getId();
    }

    private WishlistResponse toResponse(Product product) {
        return new WishlistResponse(
                product.getId(),
                product.getName(),
                product.getImageUrl(),
                product.getPrice(),
                product.getStock()
        );
    }
}
