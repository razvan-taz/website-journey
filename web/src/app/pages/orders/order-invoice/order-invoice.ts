import { Component, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService, OrderDetail } from '../../../services/order.service';

@Component({
  selector: 'app-order-invoice',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './order-invoice.html',
  styleUrl: './order-invoice.css',
})
export class OrderInvoiceComponent {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  order = signal<OrderDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.orderService.getOrderDetail(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.order.set(data); this.loading.set(false); },
        error: () => { this.error.set('Failed to load order.'); this.loading.set(false); },
      });
  }

  print() {
    window.print();
  }

  subtotal(items: OrderDetail['items']): number {
    return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }
}
