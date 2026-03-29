import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductListItem } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
] as const;

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './store.html',
  styleUrl: './store.css',
})
export class Store {
  readonly sortOptions = SORT_OPTIONS;

  categories = signal<string[]>(['All']);
  products = signal<ProductListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeCategory = signal('All');
  activeSort = signal('');
  currentPage = signal(0);
  hasMore = signal(false);
  loadingMore = signal(false);
  searchQuery = signal('');
  inStockOnly = signal(false);

  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly wishlistService = inject(WishlistService);
  readonly authService = inject(AuthService);

  private searchSubject = new Subject<string>();

  constructor() {
    // Load dynamic categories from API
    this.categoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cats) => this.categories.set(['All', ...cats.map(c => c.name).sort()]),
      error: () => {},
    });

    // Seed state from URL query params on initial load
    const qp = this.route.snapshot.queryParams;
    const initCategory = qp['category'] ?? 'All';
    const initSort = qp['sort'] ?? '';
    const initQ = qp['q'] ?? '';
    const initInStock = qp['inStock'] === 'true';

    this.activeCategory.set(initCategory);
    this.activeSort.set(initSort);
    this.searchQuery.set(initQ);
    this.inStockOnly.set(initInStock);

    this.fetchProducts(0, initCategory, false, initQ, initSort, initInStock);

    if (this.authService.isLoggedIn()) {
      this.wishlistService.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
    }

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((q) => {
      this.currentPage.set(0);
      this.syncUrl({ q });
      this.fetchProducts(0, this.activeCategory(), false, q, this.activeSort(), this.inStockOnly());
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  setCategory(category: string): void {
    if (category === this.activeCategory()) return;
    this.activeCategory.set(category);
    this.syncUrl({ category });
    this.fetchProducts(0, category, false, this.searchQuery(), this.activeSort(), this.inStockOnly());
  }

  setSort(sort: string): void {
    if (sort === this.activeSort()) return;
    this.activeSort.set(sort);
    this.syncUrl({ sort });
    this.fetchProducts(0, this.activeCategory(), false, this.searchQuery(), sort, this.inStockOnly());
  }

  toggleInStockOnly(): void {
    const next = !this.inStockOnly();
    this.inStockOnly.set(next);
    this.syncUrl({ inStock: next ? 'true' : '' });
    this.fetchProducts(0, this.activeCategory(), false, this.searchQuery(), this.activeSort(), next);
  }

  loadMore(): void {
    const nextPage = this.currentPage() + 1;
    this.fetchProducts(nextPage, this.activeCategory(), true, this.searchQuery(), this.activeSort(), this.inStockOnly());
  }

  toggleWishlist(productId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.wishlistService.toggle(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
  }

  private syncUrl(patch: Record<string, string>): void {
    const next: Record<string, string> = {
      ...(this.activeCategory() !== 'All' ? { category: this.activeCategory() } : {}),
      ...(this.searchQuery() ? { q: this.searchQuery() } : {}),
      ...(this.activeSort() ? { sort: this.activeSort() } : {}),
      ...(this.inStockOnly() ? { inStock: 'true' } : {}),
      ...patch,
    };
    // Remove keys that are empty/default
    if (next['category'] === 'All' || !next['category']) delete next['category'];
    if (!next['q']) delete next['q'];
    if (!next['sort']) delete next['sort'];
    if (!next['inStock']) delete next['inStock'];
    void this.router.navigate([], { relativeTo: this.route, queryParams: next, replaceUrl: true });
  }

  private fetchProducts(page: number, category: string, append: boolean, q: string, sort: string, inStock = false): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.error.set(null);
    }

    this.productService
      .getProducts(page, 12, category, q, sort, inStock)
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
