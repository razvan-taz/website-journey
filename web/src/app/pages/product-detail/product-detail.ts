import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductDetail as ProductDetailInterface, ProductImage, ProductListItem, ProductVariant } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { ReviewService, ReviewSummary, ReviewEligibility } from '../../services/review.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { CommentService, Comment } from '../../services/comment.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  product = signal<ProductDetailInterface | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private reviewService = inject(ReviewService);
  private wishlistService = inject(WishlistService);
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  // ── Gallery ────────────────────────────────────────
  selectedImageIndex = signal(0);

  galleryImages = computed<Array<{ id: number; url: string; displayOrder: number }>>(() => {
    const p = this.product();
    if (!p) return [];
    const primary: ProductImage = { id: -1, url: p.imageUrl, displayOrder: -1 };
    return [primary, ...(p.additionalImages ?? [])];
  });

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  isLoggedIn = this.authService.isLoggedIn;
  currentUser = this.authService.currentUser;
  showUnverifiedModal = signal(false);
  resendingVerification = signal(false);
  resendVerificationSuccess = signal(false);
  liveStock = signal<number | null>(null);
  reviewSummary = signal<ReviewSummary | null>(null);
  reviewEligibility = signal<ReviewEligibility | null>(null);
  newReviewBody = signal('');
  reviewSubmitting = signal(false);
  reviewError = signal<string | null>(null);
  reviewSuccess = signal(false);
  wishlisted = signal(false);

  private jsonLdScript: HTMLScriptElement | null = null;

  relatedProducts = signal<ProductListItem[]>([]);
  stockNotifyStatus = signal<'idle' | 'submitting' | 'done' | 'error'>('idle');

  // ── Variant selection ──────────────────────────────
  selectedAttributes = signal<Record<string, string>>({});

  uniqueAttributeKeys = computed(() => {
    const variants = this.product()?.variants ?? [];
    const keys = new Set<string>();
    variants.forEach(v => Object.keys(v.attributes).forEach(k => keys.add(k)));
    return Array.from(keys);
  });

  resolvedVariant = computed<ProductVariant | null>(() => {
    const variants = this.product()?.variants ?? [];
    if (!variants.length) return null;
    const selected = this.selectedAttributes();
    const keys = this.uniqueAttributeKeys();
    if (!keys.every(k => !!selected[k])) return null;
    return variants.find(v => keys.every(k => v.attributes[k] === selected[k])) ?? null;
  });

  hasVariants = computed(() => (this.product()?.variants?.length ?? 0) > 0);

  allAttributesSelected = computed(() =>
    this.uniqueAttributeKeys().every(k => !!this.selectedAttributes()[k])
  );

  effectiveStock = computed(() => {
    const variant = this.resolvedVariant();
    if (variant) return variant.stock;
    if (!this.hasVariants()) {
      const live = this.liveStock();
      return live !== null ? live : (this.product()?.stock ?? 0);
    }
    return 0;
  });

  effectivePrice = computed(() => {
    const p = this.product();
    if (!p) return 0;
    const variant = this.resolvedVariant();
    return p.price + (variant?.priceModifier ?? 0);
  });

  optionsForKey(key: string): string[] {
    const variants = this.product()?.variants ?? [];
    const values = new Set<string>();
    variants.forEach(v => { if (v.attributes[key]) values.add(v.attributes[key]); });
    return Array.from(values);
  }

  isOptionAvailable(key: string, value: string): boolean {
    const variants = this.product()?.variants ?? [];
    const selected = this.selectedAttributes();
    return variants.some(v =>
      v.attributes[key] === value &&
      v.stock > 0 &&
      Object.keys(selected).every(k => k === key || !selected[k] || v.attributes[k] === selected[k])
    );
  }

  selectAttribute(key: string, value: string): void {
    this.selectedAttributes.update(s => ({ ...s, [key]: value }));
  }

  private commentService = inject(CommentService);
  productComments = signal<Comment[]>([]);
  commentInput = signal('');
  commentSubmitting = signal(false);
  commentError = signal<string | null>(null);
  editingCommentId = signal<number | null>(null);
  editingContent = signal('');
  deletingCommentId = signal<number | null>(null);

  constructor() {
    const route = inject(ActivatedRoute);

    // Show modal when cart service blocks unverified add
    this.cartService.unverifiedAddAttempt$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.showUnverifiedModal.set(true));

    const id = Number(route.snapshot.paramMap.get('id'));

    this.productService
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

          // Load related products (same category, exclude current)
          this.productService.getProducts(0, 6, data.category)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (r) => this.relatedProducts.set(r.content.filter(p => p.id !== data.id).slice(0, 4)),
              error: () => {},
            });

          // Load comments
          this.commentService.getProductComments(data.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (c) => this.productComments.set(c), error: () => {} });

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

          // Subscribe to real-time stock updates for this product
          this.wsService.stockUpdates$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (payload) => {
                if (payload.productId === data.id) {
                  this.liveStock.set(payload.availableStock);
                }
              },
              error: () => {},
            });
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

  closeUnverifiedModal(): void {
    this.showUnverifiedModal.set(false);
    this.resendVerificationSuccess.set(false);
  }

  resendVerificationEmail(): void {
    if (this.resendingVerification()) return;
    this.resendingVerification.set(true);
    this.authService.resendVerification().subscribe({
      next: () => {
        this.resendVerificationSuccess.set(true);
        this.resendingVerification.set(false);
      },
      error: () => this.resendingVerification.set(false),
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

  submitProductComment(): void {
    const productId = this.product()?.id;
    if (!productId || !this.commentInput().trim()) return;
    this.commentSubmitting.set(true);
    this.commentError.set(null);
    this.commentService.addProductComment(productId, this.commentInput())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.productComments.update(list => [...list, c]);
          this.commentInput.set('');
          this.commentSubmitting.set(false);
        },
        error: (err) => {
          this.commentError.set(err?.error?.message ?? 'Failed to submit comment.');
          this.commentSubmitting.set(false);
        },
      });
  }

  startCommentEdit(comment: Comment): void {
    this.editingCommentId.set(comment.id);
    this.editingContent.set(comment.content);
  }

  saveCommentEdit(commentId: number): void {
    if (!this.editingContent().trim()) return;
    this.commentService.editComment(commentId, this.editingContent())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.productComments.update(list => list.map(c => c.id === commentId ? updated : c));
          this.editingCommentId.set(null);
        },
        error: () => {},
      });
  }

  cancelCommentEdit(): void { this.editingCommentId.set(null); }

  deleteComment(commentId: number): void {
    if (this.deletingCommentId() !== null) return;
    this.deletingCommentId.set(commentId);
    this.commentService.deleteOwnComment(commentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.productComments.update(list => list.filter(c => c.id !== commentId));
          this.deletingCommentId.set(null);
        },
        error: () => this.deletingCommentId.set(null),
      });
  }

  isCurrentUser(authorId: number): boolean {
    const user = this.authService.currentUser();
    return !!user && user.id !== undefined && user.id === authorId;
  }

  toggleWishlist(): void {
    const p = this.product();
    if (!p) return;
    this.wishlistService.toggle(p.id).subscribe({
      next: () => this.wishlisted.set(this.wishlistService.isWishlisted(p.id)),
      error: () => {},
    });
  }

  notifyWhenInStock(): void {
    const p = this.product();
    if (!p || this.stockNotifyStatus() !== 'idle') return;
    this.stockNotifyStatus.set('submitting');
    this.productService.notifyWhenInStock(p.id).subscribe({
      next: () => this.stockNotifyStatus.set('done'),
      error: () => this.stockNotifyStatus.set('error'),
    });
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    const variant = this.resolvedVariant();
    this.cartService.addItem({
      productId: p.id,
      name: variant ? `${p.name} — ${variant.name}` : p.name,
      price: this.effectivePrice(),
      imageUrl: p.imageUrl,
      variantId: variant?.id,
      variantName: variant?.name,
    });
  }
}
