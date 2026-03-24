import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService, OrderSummary } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  orders = signal<OrderSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  isLoggedIn = this.authService.isLoggedIn;

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.orderService.getMyOrders()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            this.orders.set(data);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to load orders.');
            this.loading.set(false);
          },
        });
    } else {
      this.loading.set(false);
    }
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PAID: 'Paid',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
    };
    return labels[status] ?? status;
  }
}
