import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  name = signal('');
  line1 = signal('');
  city = signal('');
  state = signal('');
  zip = signal('');
  country = signal('US');

  loading = signal(false);
  error = signal<string | null>(null);

  isFormValid = computed(() =>
    this.name().trim().length > 0 &&
    this.line1().trim().length > 0 &&
    this.city().trim().length > 0 &&
    this.state().trim().length > 0 &&
    this.zip().trim().length > 0
  );

  placeOrder(): void {
    if (!this.isFormValid() || this.loading()) return;

    const items = this.cartService.items();
    if (items.length === 0) {
      this.error.set('Your cart is empty.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.orderService.placeOrder({
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingAddress: {
        name: this.name(),
        line1: this.line1(),
        city: this.city(),
        state: this.state(),
        zip: this.zip(),
        country: this.country(),
      },
      total: this.cartService.subtotal(),
    }).subscribe({
      next: (confirmation) => {
        this.cartService.clearCart();
        this.router.navigate(['/order-confirmation'], {
          state: { confirmation }
        });
      },
      error: () => {
        this.error.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
