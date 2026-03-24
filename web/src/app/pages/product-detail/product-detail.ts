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
import { WebSocketService } from '../../services/websocket.service';
import { CommentService, Comment } from '../../services/comment.service';
import { DatePipe } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SlicePipe, DatePipe],
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
  private wsService = inject(WebSocketService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);

  isLoggedIn = this.authService.isLoggedIn;
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
  private destroy$ = new Subject<void>();

  private commentService = inject(CommentService);
  productComments = signal<Comment[]>([]);
  commentInput = signal('');
  commentSubmitting = signal(false);
  commentError = signal<string | null>(null);
  editingCommentId = signal<number | null>(null);
  editingContent = signal('');

  constructor() {
    const route = inject(ActivatedRoute);
    const productService = inject(ProductService);

    // Show modal when cart service blocks unverified add
    this.cartService.unverifiedAddAttempt$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.showUnverifiedModal.set(true));

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
      this.destroy$.next();
      this.destroy$.complete();
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

  isCurrentUser(authorName: string): boolean {
    const user = this.authService.currentUser();
    return !!user && user.name === authorName;
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
