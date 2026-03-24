import { Component, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface AnalyticsDto {
  revenue: { thisMonth: number; thisYear: number; total: number };
  users: { thisMonth: number; thisYear: number; total: number };
  completedOrders: number;
  newsletterSubscribers: number;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './admin-analytics.html',
  styleUrl: './admin-analytics.css',
})
export class AdminAnalyticsComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  data = signal<AnalyticsDto | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    this.http.get<AnalyticsDto>('/api/admin/analytics')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: () => { this.error.set('Failed to load analytics.'); this.loading.set(false); },
      });
  }
}
