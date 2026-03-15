import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductListItem } from '../../../services/product.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.css',
})
export class AdminProducts {
  private productService = inject(ProductService);
  products = signal<ProductListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal<number | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productService.getProducts(0, 100)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => { this.products.set(r.content); this.loading.set(false); },
        error: () => { this.error.set('Failed to load.'); this.loading.set(false); }
      });
  }

  delete(id: number, name: string): void {
    if (!confirm(`Delete "${name}"?`)) return;
    this.deleting.set(id);
    this.productService.deleteProduct(id).subscribe({
      next: () => { this.products.update(list => list.filter(p => p.id !== id)); this.deleting.set(null); },
      error: () => { alert('Delete failed.'); this.deleting.set(null); }
    });
  }
}
