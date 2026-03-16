import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WishlistService, WishlistItem } from '../../services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class Wishlist {
  items = signal<WishlistItem[]>([]);
  loading = signal(true);

  private wishlistService = inject(WishlistService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.wishlistService.load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  remove(productId: number): void {
    this.wishlistService.remove(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.items.update(list => list.filter(i => i.productId !== productId)),
      });
  }
}
