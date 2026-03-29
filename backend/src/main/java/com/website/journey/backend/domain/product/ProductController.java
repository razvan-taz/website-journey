package com.website.journey.backend.domain.product;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<Page<ProductDto>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "") String sort,
            @RequestParam(required = false) Boolean inStock) {
        Sort pageSort = switch (sort) {
            case "price_asc"  -> Sort.by("price").ascending();
            case "price_desc" -> Sort.by("price").descending();
            case "newest"     -> Sort.by("createdAt").descending();
            default           -> Sort.by("id").ascending();
        };
        Page<ProductDto> result = productService.findAll(category, q, inStock, PageRequest.of(page, size, pageSort));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
                .body(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailDto> findById(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic())
                .body(productService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ProductDetailDto> create(@Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDetailDto> update(
            @PathVariable Long id,
            @Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/stock-notify")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> stockNotify(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        productService.addStockNotification(id, auth.getName());
        return ResponseEntity.ok().build();
    }

    // --- Gallery endpoints ---

    @PostMapping("/{id}/images")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDetailDto> addImage(
            @PathVariable Long id,
            @Valid @RequestBody AddProductImageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productService.addImage(id, request.getUrl()));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDetailDto> removeImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        return ResponseEntity.ok(productService.removeImage(id, imageId));
    }

    @PutMapping("/{id}/images/reorder")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDetailDto> reorderImages(
            @PathVariable Long id,
            @Valid @RequestBody ReorderProductImagesRequest request) {
        return ResponseEntity.ok(productService.reorderImages(id, request.getOrderedIds()));
    }
}
