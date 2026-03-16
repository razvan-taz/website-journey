package com.website.journey.backend.domain.wishlist;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public ResponseEntity<List<WishlistResponse>> getWishlist(Authentication authentication) {
        Long userId = wishlistService.resolveUserId(authentication.getName());
        return ResponseEntity.ok(wishlistService.getWishlist(userId));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<Void> addToWishlist(
            @PathVariable Long productId,
            Authentication authentication) {
        Long userId = wishlistService.resolveUserId(authentication.getName());
        wishlistService.addToWishlist(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFromWishlist(
            @PathVariable Long productId,
            Authentication authentication) {
        Long userId = wishlistService.resolveUserId(authentication.getName());
        wishlistService.removeFromWishlist(userId, productId);
        return ResponseEntity.noContent().build();
    }
}
