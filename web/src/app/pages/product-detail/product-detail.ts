import { Component, inject, signal, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, SlicePipe } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductDetail as ProductDetailInterface } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { ReviewService, ReviewSummary, ReviewEligibility } from '../../services/review.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SlicePipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  product = signal<ProductDetailInterface | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private cartService = inject(CartService);
  private reviewService = inject(ReviewService);
  private wishlistService = inject(WishlistService);
  private authService = inject(AuthService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  isLoggedIn = this.authService.isLoggedIn;
  reviewSummary = signal<ReviewSummary | null>(null);
  reviewEligibility = signal<ReviewEligibility | null>(null);
  newReviewBody = signal('');
  reviewSubmitting = signal(false);
  reviewError = signal<string | null>(null);
  reviewSuccess = signal(false);
  wishlisted = signal(false);

  private jsonLdScript: HTMLScriptElement | null = null;

  constructor() {
    const route = inject(ActivatedRoute);
    const productService = inject(ProductService);

    const id = Number(route.snapshot.paramMap.get('id'));

    productService
      .getProductById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.product.set(data);
          this.loading.set(false);

          const title = `${data.name} | Journey`;
          this.titleService.setTitle(title);
          this.metaService.updateTag({ name: 'description', content: data.description });
          this.metaService.updateTag({ property: 'og:title', content: title });
          this.metaService.updateTag({ property: 'og:description', content: data.description });
          this.metaService.updateTag({ property: 'og:type', content: 'product' });
          if (data.imageUrl) {
            this.metaService.updateTag({ property: 'og:image', content: data.imageUrl });
          }

          this.metaService.updateTag({ name: 'twitter:card', content: data.imageUrl ? 'summary_large_image' : 'summary' });
          this.metaService.updateTag({ name: 'twitter:title', content: title });
          this.metaService.updateTag({ name: 'twitter:description', content: data.description });
          if (data.imageUrl) {
            this.metaService.updateTag({ name: 'twitter:image', content: data.imageUrl });
          }

          const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: data.name,
            description: data.description,
            ...(data.imageUrl ? { image: data.imageUrl } : {}),
            offers: {
              '@type': 'Offer',
              price: data.price,
              priceCurrency: 'EUR',
              availability: data.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          };

          this.jsonLdScript = this.document.createElement('script');
          this.jsonLdScript.type = 'application/ld+json';
          this.jsonLdScript.text = JSON.stringify(jsonLd);
          this.document.head.appendChild(this.jsonLdScript);

          // Load reviews
          this.reviewService.getReviews(data.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (r) => this.reviewSummary.set(r), error: () => {} });

          // Load eligibility and wishlist state if logged in
          if (this.isLoggedIn()) {
            this.reviewService.getEligibility(data.id)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ next: (e) => this.reviewEligibility.set(e), error: () => {} });

            this.wishlisted.set(this.wishlistService.isWishlisted(data.id));
          }
        },
        error: (err) => {
          if (err.status === 404) {
            this.error.set('not-found');
          } else {
            this.error.set('server-error');
          }
          this.loading.set(false);
        },
      });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.jsonLdScript) {
        this.jsonLdScript.remove();
        this.jsonLdScript = null;
      }
    });
  }

  submitReview(): void {
    const p = this.product();
    if (!p || this.reviewSubmitting()) return;
    const body = this.newReviewBody().trim();
    if (!body) return;

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);
    this.reviewService.submitReview(p.id, { body }).subscribe({
      next: () => {
        this.reviewSuccess.set(true);
        this.newReviewBody.set('');
        this.reviewSubmitting.set(false);
        this.reviewService.getReviews(p.id).subscribe({ next: (r) => this.reviewSummary.set(r) });
      },
      error: (err) => {
        this.reviewError.set(
          err.status === 409 ? 'You have already reviewed this product.' :
          err.status === 403 ? 'You must purchase this product before reviewing it.' :
          'Failed to submit review.'
        );
        this.reviewSubmitting.set(false);
      },
    });
  }

  toggleWishlist(): void {
    const p = this.product();
    if (!p) return;
    this.wishlistService.toggle(p.id).subscribe({
      next: () => this.wishlisted.set(this.wishlistService.isWishlisted(p.id)),
      error: () => {},
    });
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.cartService.addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
    });
  }
}
