package com.website.journey.backend.domain.cart;

import java.util.List;

public record MergeCartRequest(List<MergeItem> items) {

    public record MergeItem(Long productId, Integer quantity) {
    }
}
