import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminOrderService,
  AdminOrder,
  AdminOrderPageResponse,
  OrderStatus,
} from '../../../services/admin-order.service';

type StatusFilter = OrderStatus | 'ALL';

interface StatusTab {
  label: string;
  value: StatusFilter;
}

const STATUS_TABS: StatusTab[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending Payment', value: 'PENDING_PAYMENT' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css',
})
export class AdminOrders {
  private orderService = inject(AdminOrderService);
  private destroyRef = inject(DestroyRef);

  readonly statusTabs = STATUS_TABS;

  orders = signal<AdminOrder[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<StatusFilter>('ALL');
  updatingOrderId = signal<number | null>(null);

  page = signal(0);
  pageSize = 20;
  totalPages = signal(0);
  totalElements = signal(0);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService
      .getOrders(this.page(), this.pageSize, this.activeTab())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r: AdminOrderPageResponse) => {
          this.orders.set(r.content);
          this.totalPages.set(r.totalPages);
          this.totalElements.set(r.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load orders.');
          this.loading.set(false);
        },
      });
  }

  setTab(tab: StatusFilter): void {
    this.activeTab.set(tab);
    this.page.set(0);
    this.load();
  }

  prevPage(): void {
    if (this.page() <= 0) return;
    this.page.update(p => p - 1);
    this.load();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages() - 1) return;
    this.page.update(p => p + 1);
    this.load();
  }

  getNextStatus(status: OrderStatus): OrderStatus | null {
    return NEXT_STATUS[status] ?? null;
  }

  markAs(order: AdminOrder): void {
    const next = this.getNextStatus(order.status);
    if (!next) return;
    this.updatingOrderId.set(order.orderId);
    this.orderService.updateOrderStatus(order.orderId, next).subscribe({
      next: (updated) => {
        this.orders.update(list =>
          list.map(o => (o.orderId === updated.orderId ? updated : o))
        );
        this.updatingOrderId.set(null);
      },
      error: () => {
        alert('Failed to update order status.');
        this.updatingOrderId.set(null);
      },
    });
  }

  statusBadgeClass(status: OrderStatus): string {
    switch (status) {
      case 'PAID':
      case 'DELIVERED':
        return 'badge-green';
      case 'PROCESSING':
      case 'SHIPPED':
        return 'badge-yellow';
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
        return 'badge-red';
      case 'PENDING_PAYMENT':
      default:
        return 'badge-grey';
    }
  }

  formatOrderId(id: number): string {
    return id.toString().padStart(8, '0').slice(-8);
  }

  itemsSummary(order: AdminOrder): string {
    const count = order.items.reduce((s, i) => s + i.quantity, 0);
    return `${count} item${count !== 1 ? 's' : ''}`;
  }
}
