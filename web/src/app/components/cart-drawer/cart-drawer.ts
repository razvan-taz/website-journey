import { Component, inject, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.css',
})
export class CartDrawer {
  cartService = inject(CartService);
  closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  increment(productId: number, currentQty: number): void {
    this.cartService.updateQuantity(productId, currentQty + 1);
  }

  decrement(productId: number, currentQty: number): void {
    this.cartService.updateQuantity(productId, currentQty - 1);
  }
}
