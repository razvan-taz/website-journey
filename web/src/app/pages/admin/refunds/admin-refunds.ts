import { Component, inject, signal, DestroyRef } from '@angular/core';
import { SlicePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RefundService, RefundRequest, RefundPage } from '../../../services/refund.service';

type StatusFilter = '' | 'PENDING' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-admin-refunds',
  standalone: true,
  imports: [SlicePipe, DatePipe, FormsModule],
  templateUrl: './admin-refunds.html',
  styleUrl: './admin-refunds.css',
})
export class AdminRefunds {
  private refundService = inject(RefundService);
  private destroyRef = inject(DestroyRef);

  refunds = signal<RefundRequest[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  totalPages = signal(0);
  totalElements = signal(0);
  currentPage = signal(0);
  pageSize = 20;

  activeFilter = signal<StatusFilter>('');

  // Reject modal state
  rejectingId = signal<number | null>(null);
  rejectReason = signal('');
  rejectSubmitting = signal(false);
  rejectError = signal<string | null>(null);

  // Row-level action feedback
  actionErrors = signal<Record<number, string>>({});

  constructor() {
    this.load();
  }

  setFilter(status: StatusFilter): void {
    this.activeFilter.set(status);
    this.currentPage.set(0);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.refundService.getRefunds(this.activeFilter(), this.currentPage(), this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page: RefundPage) => {
          this.refunds.set(page.content);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load refund requests.');
          this.loading.set(false);
        },
      });
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }

  approve(id: number): void {
    this.refundService.approveRefund(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.refunds.update(list =>
            list.map(r => r.id === id ? { ...r, status: 'APPROVED' as const } : r)
          );
        },
        error: (err) => {
          this.actionErrors.update(e => ({
            ...e,
            [id]: err.error?.message ?? 'Failed to approve.',
          }));
        },
      });
  }

  openRejectModal(id: number): void {
    this.rejectingId.set(id);
    this.rejectReason.set('');
    this.rejectError.set(null);
  }

  closeRejectModal(): void {
    this.rejectingId.set(null);
    this.rejectReason.set('');
    this.rejectError.set(null);
  }

  submitReject(): void {
    const id = this.rejectingId();
    const reason = this.rejectReason().trim();
    if (!id || !reason || this.rejectSubmitting()) return;

    this.rejectSubmitting.set(true);
    this.rejectError.set(null);

    this.refundService.rejectRefund(id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.refunds.update(list =>
            list.map(r => r.id === id ? { ...r, status: 'REJECTED' as const, rejectionReason: reason } : r)
          );
          this.rejectSubmitting.set(false);
          this.closeRejectModal();
        },
        error: (err) => {
          this.rejectError.set(err.error?.message ?? 'Failed to reject.');
          this.rejectSubmitting.set(false);
        },
      });
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i);
  }
}
