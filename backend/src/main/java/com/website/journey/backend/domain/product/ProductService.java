package com.website.journey.backend.domain.product;

import com.website.journey.backend.websocket.WebSocketEventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {

    private static final int LOW_STOCK_THRESHOLD = 5;

    private final ProductRepository productRepository;
    private final WebSocketEventService webSocketEventService;

    public ProductService(ProductRepository productRepository,
                          WebSocketEventService webSocketEventService) {
        this.productRepository = productRepository;
        this.webSocketEventService = webSocketEventService;
    }

    @Transactional(readOnly = true)
    public Page<ProductDto> findAll(String category, Pageable pageable) {
        Page<Product> page = (category != null && !category.isBlank())
                ? productRepository.findAllByActiveTrueAndCategoryIgnoreCase(category, pageable)
                : productRepository.findAllByActiveTrue(pageable);
        return page.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public ProductDetailDto findById(Long id) {
        return productRepository.findByIdAndActiveTrue(id)
                .map(this::toDetailDto)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));
    }

    @Transactional
    public ProductDetailDto create(CreateProductRequest request) {
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .category(request.getCategory())
                .stock(request.getStock())
                .active(true)
                .build();

        Product saved = productRepository.save(product);

        // Emit stock-updated event for new product
        webSocketEventService.emitStockUpdated(saved.getId(), saved.getStock());

        // Check low-stock threshold for newly created products
        if (saved.getStock() <= LOW_STOCK_THRESHOLD) {
            webSocketEventService.emitLowStock(saved.getId(), saved.getName(), saved.getStock());
        }

        return toDetailDto(saved);
    }

    @Transactional
    public ProductDetailDto update(Long id, CreateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));

        int previousStock = product.getStock();

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setImageUrl(request.getImageUrl());
        product.setCategory(request.getCategory());
        product.setStock(request.getStock());

        Product saved = productRepository.save(product);

        int newStock = saved.getStock();

        // Emit stock-updated event if stock changed
        if (previousStock != newStock) {
            webSocketEventService.emitStockUpdated(saved.getId(), newStock);

            // Emit low-stock alert only when stock crosses the threshold
            // (was above threshold before, now at or below it)
            if (previousStock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD) {
                webSocketEventService.emitLowStock(saved.getId(), saved.getName(), newStock);
            }
        }

        return toDetailDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));

        product.setActive(false);
        productRepository.save(product);
    }

    private ProductDto toDto(Product product) {
        return ProductDto.builder()
                .id(product.getId())
                .name(product.getName())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .category(product.getCategory())
                .stock(product.getStock())
                .build();
    }

    private ProductDetailDto toDetailDto(Product product) {
        return ProductDetailDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .category(product.getCategory())
                .stock(product.getStock())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
