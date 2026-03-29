import { Component, inject, signal, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReviewService, AdminReviewItem } from '../../../services/review.service';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-reviews.html',
  styleUrl: './admin-reviews.css',
})
export class AdminReviews {
  private reviewService = inject(ReviewService);
  private destroyRef = inject(DestroyRef);

  reviews = signal<AdminReviewItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  page = signal(0);
  readonly pageSize = 20;
  totalPages = signal(0);
  totalElements = signal(0);

  deletingId = signal<number | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reviewService.adminGetReviews(this.page(), this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.reviews.set(r.content);
          this.totalPages.set(r.totalPages);
          this.totalElements.set(r.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load reviews.');
          this.loading.set(false);
        },
      });
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

  deleteReview(review: AdminReviewItem): void {
    if (!confirm(`Delete this review by ${review.userName}?`)) return;
    this.deletingId.set(review.id);
    this.reviewService.adminDeleteReview(review.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reviews.update(list => list.filter(r => r.id !== review.id));
          this.totalElements.update(n => n - 1);
          this.deletingId.set(null);
        },
        error: () => {
          alert('Failed to delete review.');
          this.deletingId.set(null);
        },
      });
  }

  truncate(text: string, max = 100): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
}
