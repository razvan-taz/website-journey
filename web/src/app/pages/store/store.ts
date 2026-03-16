import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductListItem } from '../../services/product.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

const CATEGORIES = ['All', 'Apparel', 'Accessories', 'Digital'] as const;
type Category = (typeof CATEGORIES)[number];

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.css',
})
export class Store {
  readonly categories = CATEGORIES;

  products = signal<ProductListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeCategory = signal<Category>('All');
  currentPage = signal(0);
  hasMore = signal(false);
  loadingMore = signal(false);

  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);
  readonly wishlistService = inject(WishlistService);
  readonly authService = inject(AuthService);

  constructor() {
    this.fetchProducts(0, 'All', false);
    if (this.authService.isLoggedIn()) {
      this.wishlistService.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  setCategory(category: Category): void {
    if (category === this.activeCategory()) return;
    this.activeCategory.set(category);
    this.fetchProducts(0, category, false);
  }

  loadMore(): void {
    const nextPage = this.currentPage() + 1;
    this.fetchProducts(nextPage, this.activeCategory(), true);
  }

  toggleWishlist(productId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.toggle(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private fetchProducts(page: number, category: Category, append: boolean): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.error.set(null);
    }

    this.productService
      .getProducts(page, 12, category)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (append) {
            this.products.update(existing => [...existing, ...response.content]);
            this.loadingMore.set(false);
          } else {
            this.products.set(response.content);
            this.loading.set(false);
          }
          this.currentPage.set(page);
          this.hasMore.set(!response.last);
        },
        error: () => {
          if (!append) {
            this.error.set('Failed to load products. Please try again later.');
            this.loading.set(false);
          } else {
            this.loadingMore.set(false);
          }
        },
      });
  }
}
