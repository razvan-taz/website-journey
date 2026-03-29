import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

const BULK_STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: 'Mark as Processing', value: 'PROCESSING' },
  { label: 'Mark as Shipped', value: 'SHIPPED' },
  { label: 'Mark as Delivered', value: 'DELIVERED' },
  { label: 'Cancel', value: 'CANCELLED' },
];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css',
})
export class AdminOrders {
  private orderService = inject(AdminOrderService);
  private destroyRef = inject(DestroyRef);

  readonly statusTabs = STATUS_TABS;
  readonly bulkStatusOptions = BULK_STATUS_OPTIONS;

  orders = signal<AdminOrder[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<StatusFilter>('ALL');
  updatingOrderId = signal<number | null>(null);

  page = signal(0);
  pageSize = 20;
  totalPages = signal(0);
  totalElements = signal(0);

  // Bulk selection
  selectedIds = signal<Set<number>>(new Set());
  bulkStatus = signal<OrderStatus>('PROCESSING');
  bulkUpdating = signal(false);

  allSelected = computed(() => {
    const ids = this.selectedIds();
    const orders = this.orders();
    return orders.length > 0 && orders.every(o => ids.has(o.orderId));
  });

  someSelected = computed(() => this.selectedIds().size > 0);

  // Tracking number editing
  editingTrackingId = signal<number | null>(null);
  trackingDraft = signal('');
  savingTrackingId = signal<number | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.selectedIds.set(new Set());
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

  // ── Bulk selection ──────────────────────────────────

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  toggleSelect(orderId: number): void {
    this.selectedIds.update(ids => {
      const next = new Set(ids);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.orders().map(o => o.orderId)));
    }
  }

  onBulkStatusChange(event: Event): void {
    this.bulkStatus.set((event.target as HTMLSelectElement).value as OrderStatus);
  }

  setBulkStatus(value: string): void {
    this.bulkStatus.set(value as OrderStatus);
  }

  applyBulkAction(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    const status = this.bulkStatus();
    if (!confirm(`Mark ${ids.length} order(s) as ${status}?`)) return;
    this.bulkUpdating.set(true);
    this.orderService.bulkUpdateStatus(ids, status).subscribe({
      next: (updated) => {
        const updatedMap = new Map(updated.map(o => [o.orderId, o]));
        this.orders.update(list =>
          list.map(o => updatedMap.has(o.orderId) ? updatedMap.get(o.orderId)! : o)
        );
        this.selectedIds.set(new Set());
        this.bulkUpdating.set(false);
      },
      error: () => {
        alert('Bulk update failed.');
        this.bulkUpdating.set(false);
      },
    });
  }

  // ── Tracking number ─────────────────────────────────

  startEditTracking(order: AdminOrder): void {
    this.editingTrackingId.set(order.orderId);
    this.trackingDraft.set(order.trackingNumber ?? '');
  }

  cancelEditTracking(): void {
    this.editingTrackingId.set(null);
    this.trackingDraft.set('');
  }

  saveTracking(order: AdminOrder): void {
    const tracking = this.trackingDraft().trim();
    this.savingTrackingId.set(order.orderId);
    this.orderService.setTrackingNumber(order.orderId, tracking).subscribe({
      next: (updated) => {
        this.orders.update(list =>
          list.map(o => (o.orderId === updated.orderId ? updated : o))
        );
        this.editingTrackingId.set(null);
        this.savingTrackingId.set(null);
      },
      error: () => {
        alert('Failed to save tracking number.');
        this.savingTrackingId.set(null);
      },
    });
  }

  // ── CSV export ──────────────────────────────────────

  exportCsv(): void {
    const orders = this.orders();
    const rows = [
      ['Order ID', 'Customer', 'Items', 'Total (EUR)', 'Status', 'Date', 'Tracking'],
      ...orders.map(o => [
        this.formatOrderId(o.orderId),
        o.customerEmail,
        this.itemsSummary(o),
        o.total.toFixed(2),
        o.status,
        new Date(o.createdAt).toLocaleDateString('en-GB'),
        o.trackingNumber ?? '',
      ]),
    ];
    const sanitizeCell = (cell: string) => {
      const escaped = cell.replace(/"/g, '""');
      const defused = /^[=@+\-]/.test(escaped) ? `\t${escaped}` : escaped;
      return `"${defused}"`;
    };
    const csv = rows.map(r => r.map(cell => sanitizeCell(String(cell))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${this.activeTab().toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ─────────────────────────────────────────

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
