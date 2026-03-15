import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductListItem } from '../../services/product.service';

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

  filteredProducts = computed(() => {
    const category = this.activeCategory();
    const all = this.products();
    if (category === 'All') return all;
    return all.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  });

  constructor() {
    this.productService
      .getProducts(0, 12)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.content);
          this.currentPage.set(0);
          this.hasMore.set(!response.last);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load products. Please try again later.');
          this.loading.set(false);
        },
      });
  }

  setCategory(category: Category): void {
    this.activeCategory.set(category);
  }

  loadMore(): void {
    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);
    this.productService
      .getProducts(nextPage, 12)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.update(existing => [...existing, ...response.content]);
          this.currentPage.set(nextPage);
          this.hasMore.set(!response.last);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }
}
