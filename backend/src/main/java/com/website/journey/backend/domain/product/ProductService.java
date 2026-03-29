package com.website.journey.backend.domain.product;

import com.website.journey.backend.config.EmailService;
import com.website.journey.backend.websocket.WebSocketEventService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProductService {

    private static final int LOW_STOCK_THRESHOLD = 5;
    private static final int MAX_ADDITIONAL_IMAGES = 7;

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final StockNotificationRepository stockNotificationRepository;
    private final WebSocketEventService webSocketEventService;
    private final EmailService emailService;

    public ProductService(ProductRepository productRepository,
                          ProductImageRepository productImageRepository,
                          StockNotificationRepository stockNotificationRepository,
                          WebSocketEventService webSocketEventService,
                          EmailService emailService) {
        this.productRepository = productRepository;
        this.productImageRepository = productImageRepository;
        this.stockNotificationRepository = stockNotificationRepository;
        this.webSocketEventService = webSocketEventService;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public Page<ProductDto> findAll(String category, String q, Boolean inStock, Pageable pageable) {
        String cat = (category != null && !category.isBlank()) ? category : null;
        String query = (q != null && !q.isBlank()) ? q : null;
        Boolean stockFilter = Boolean.TRUE.equals(inStock) ? Boolean.TRUE : null;
        return productRepository.findAllWithFilters(query, cat, stockFilter, pageable).map(this::toDto);
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

            // Back-in-stock notifications: product was out of stock and now has stock
            if (previousStock == 0 && newStock > 0) {
                sendBackInStockEmails(saved);
            }
        }

        return toDetailDto(saved);
    }

    @Transactional
    public void addStockNotification(Long productId, String userEmail) {
        if (!productRepository.existsById(productId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
        if (!stockNotificationRepository.existsByProductIdAndUserEmail(productId, userEmail)) {
            stockNotificationRepository.save(
                    StockNotification.builder()
                            .productId(productId)
                            .userEmail(userEmail)
                            .build());
        }
    }

    private void sendBackInStockEmails(Product product) {
        List<StockNotification> notifications = stockNotificationRepository.findAllByProductId(product.getId());
        for (StockNotification n : notifications) {
            emailService.sendBackInStockEmail(n.getUserEmail(), product.getName(), product.getId());
        }
        stockNotificationRepository.deleteAllByProductId(product.getId());
    }

    @Transactional
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));

        product.setActive(false);
        productRepository.save(product);
    }

    // --- Gallery management ---

    @Transactional
    public ProductDetailDto addImage(Long productId, String url) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));

        long currentCount = productImageRepository.countByProductId(productId);
        if (currentCount >= MAX_ADDITIONAL_IMAGES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Product already has the maximum of " + MAX_ADDITIONAL_IMAGES + " additional images");
        }

        int nextOrder = productImageRepository.findMaxDisplayOrderByProductId(productId)
                .map(max -> max + 1)
                .orElse(0);

        ProductImage image = ProductImage.builder()
                .product(product)
                .url(url)
                .displayOrder(nextOrder)
                .build();

        productImageRepository.save(image);

        return toDetailDto(productRepository.findById(productId).orElseThrow());
    }

    @Transactional
    public ProductDetailDto removeImage(Long productId, Long imageId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));

        ProductImage image = productImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Image not found"));

        productImageRepository.delete(image);

        return toDetailDto(productRepository.findById(productId).orElseThrow());
    }

    @Transactional
    public ProductDetailDto reorderImages(Long productId, List<Long> orderedIds) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Product not found"));

        for (int i = 0; i < orderedIds.size(); i++) {
            Long imageId = orderedIds.get(i);
            ProductImage image = productImageRepository.findByIdAndProductId(imageId, productId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Image " + imageId + " not found for this product"));
            image.setDisplayOrder(i);
            productImageRepository.save(image);
        }

        return toDetailDto(productRepository.findById(productId).orElseThrow());
    }

    // --- Mappers ---

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
        List<String> imageUrls = productImageRepository
                .findAllByProductIdOrderByDisplayOrderAsc(product.getId())
                .stream()
                .map(ProductImage::getUrl)
                .toList();

        return ProductDetailDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .imageUrl(product.getImageUrl())
                .category(product.getCategory())
                .stock(product.getStock())
                .additionalImages(imageUrls)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
