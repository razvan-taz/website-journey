import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductListItem } from '../../../services/product.service';

const LOW_STOCK_KEY = 'admin_low_stock_threshold';
const DEFAULT_THRESHOLD = 5;
const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css',
})
export class AdminProducts {
  private productService = inject(ProductService);
  private platformId = inject(PLATFORM_ID);
  products = signal<ProductListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal<number | null>(null);

  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  lowStockThreshold = signal<number>(
    isPlatformBrowser(this.platformId)
      ? Math.max(0, Number(localStorage.getItem(LOW_STOCK_KEY) ?? DEFAULT_THRESHOLD) || DEFAULT_THRESHOLD)
      : DEFAULT_THRESHOLD
  );

  lowStockCount = computed(() =>
    this.products().filter(p => p.stock > 0 && p.stock <= this.lowStockThreshold()).length
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productService.getProducts(this.page(), PAGE_SIZE)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => {
          this.products.set(r.content);
          this.totalPages.set(r.totalPages);
          this.totalElements.set(r.totalElements);
          this.loading.set(false);
        },
        error: () => { this.error.set('Failed to load.'); this.loading.set(false); }
      });
  }

  prevPage(): void {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update(p => p + 1);
      this.load();
    }
  }

  delete(id: number, name: string): void {
    if (this.deleting() !== null) return;
    if (!confirm(`Delete "${name}"?`)) return;
    this.deleting.set(id);
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.products.update(list => list.filter(p => p.id !== id));
        this.deleting.set(null);
        this.totalElements.update(n => n - 1);
      },
      error: () => { alert('Delete failed.'); this.deleting.set(null); }
    });
  }

  updateThreshold(value: number): void {
    const v = Math.max(0, value);
    this.lowStockThreshold.set(v);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LOW_STOCK_KEY, String(v));
    }
  }

  stockClass(stock: number): string {
    if (stock === 0) return 'stock-out';
    if (stock <= this.lowStockThreshold()) return 'stock-low';
    return '';
  }
}
