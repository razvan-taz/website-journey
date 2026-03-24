import { Component, inject, signal, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NewsletterService,
  NewsletterSubscriber,
} from '../../../services/newsletter.service';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-admin-newsletter',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-newsletter.html',
  styleUrl: './admin-newsletter.css',
})
export class AdminNewsletter {
  private newsletterService = inject(NewsletterService);
  private destroyRef = inject(DestroyRef);

  subscribers = signal<NewsletterSubscriber[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  removing = signal<number | null>(null);

  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.newsletterService
      .getSubscribers(this.page(), PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.subscribers.set(r.content);
          this.totalPages.set(r.totalPages);
          this.totalElements.set(r.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load subscribers.');
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

  exportCsv(): void {
    this.newsletterService.exportSubscribersCsv();
  }

  remove(id: number): void {
    if (!confirm('Remove this subscriber?')) return;
    this.removing.set(id);
    this.newsletterService.removeSubscriber(id).subscribe({
      next: () => {
        this.subscribers.update(list => list.filter(s => s.id !== id));
        this.totalElements.update(n => n - 1);
        this.removing.set(null);
      },
      error: () => {
        alert('Failed to remove subscriber.');
        this.removing.set(null);
      },
    });
  }
}
