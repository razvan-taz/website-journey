import { Component, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService, OrderDetail } from '../../../services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetailComponent {
  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  order = signal<OrderDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  refundReason = signal('');
  refundSubmitting = signal(false);
  refundSuccess = signal(false);
  refundError = signal<string | null>(null);
  showRefundForm = signal(false);
  cancelError = signal<string | null>(null);
  cancelling = signal(false);
  copiedField = signal<string | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.orderService.getOrderDetail(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => { this.order.set(data); this.loading.set(false); },
        error: () => { this.error.set('Failed to load order.'); this.loading.set(false); },
      });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending', PAID: 'Paid', PROCESSING: 'Processing',
      SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REFUNDED: 'Refunded',
    };
    return labels[status] ?? status;
  }

  canRequestRefund(status: string): boolean {
    return ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status);
  }

  canCancelOrder(status: string): boolean {
    return status === 'PENDING' || status === 'PROCESSING';
  }

  cancelOrder() {
    const o = this.order();
    if (!o) return;
    if (!confirm('Are you sure you want to cancel this order? This cannot be undone.')) return;
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.orderService.cancelOrder(o.orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => { this.order.set(updated); this.cancelling.set(false); },
        error: (err) => {
          this.cancelError.set(err?.error?.message ?? 'Failed to cancel order.');
          this.cancelling.set(false);
        },
      });
  }

  copy(text: string, field: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField.set(field);
      setTimeout(() => this.copiedField.set(null), 1500);
    });
  }

  submitRefund() {
    const o = this.order();
    if (!o || !this.refundReason().trim()) return;
    this.refundSubmitting.set(true);
    this.refundError.set(null);
    this.orderService.submitRefundRequest(o.orderId, this.refundReason())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.refundSuccess.set(true); this.refundSubmitting.set(false); this.showRefundForm.set(false); },
        error: (err) => {
          this.refundError.set(err?.error?.message ?? 'Failed to submit refund request.');
          this.refundSubmitting.set(false);
        },
      });
  }
}
