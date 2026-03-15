import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService, ProductDetail as ProductDetailInterface } from '../../services/product.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  product = signal<ProductDetailInterface | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private cartService = inject(CartService);

  constructor() {
    const route = inject(ActivatedRoute);
    const productService = inject(ProductService);

    const id = Number(route.snapshot.paramMap.get('id'));

    productService
      .getProductById(id)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (data) => {
          this.product.set(data);
          this.loading.set(false);
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
