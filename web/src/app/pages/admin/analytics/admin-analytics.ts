import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface AnalyticsDto {
  revenue: { thisMonth: number; thisYear: number; total: number };
  users: { thisMonth: number; thisYear: number; total: number };
  completedOrders: number;
  newsletterSubscribers: number;
}

interface ChartsDto {
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; revenue: number }[];
}

interface DailyBar {
  x: number;
  y: number;
  h: number;
  label: string;
  revenue: number;
  orders: number;
}

interface TopBar {
  name: string;
  revenue: number;
  pct: number;
}

const BAR_W = 14;
const BAR_STEP = 18;
const BAR_AREA_H = 100;
const SVG_H = 120;

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

  chartData = signal<ChartsDto | null>(null);
  chartLoading = signal(true);
  chartError = signal<string | null>(null);

  readonly barW = BAR_W;
  readonly svgH = SVG_H;

  svgWidth = computed(() => {
    const d = this.chartData();
    if (!d || !d.dailyRevenue.length) return 0;
    return d.dailyRevenue.length * BAR_STEP;
  });

  dailyBars = computed<DailyBar[]>(() => {
    const d = this.chartData();
    if (!d || !d.dailyRevenue.length) return [];
    const maxRev = Math.max(...d.dailyRevenue.map(p => p.revenue), 0.01);
    return d.dailyRevenue.map((p, i) => {
      const h = Math.max(2, Math.round((p.revenue / maxRev) * BAR_AREA_H));
      return {
        x: i * BAR_STEP + 2,
        y: BAR_AREA_H - h,
        h,
        label: p.date.slice(5),
        revenue: p.revenue,
        orders: p.orders,
      };
    });
  });

  topBars = computed<TopBar[]>(() => {
    const d = this.chartData();
    if (!d || !d.topProducts.length) return [];
    const maxRev = Math.max(...d.topProducts.map(p => p.revenue), 0.01);
    return d.topProducts.map(p => ({
      name: p.name,
      revenue: p.revenue,
      pct: Math.max(2, Math.round((p.revenue / maxRev) * 100)),
    }));
  });

  constructor() {
    this.http.get<AnalyticsDto>('/api/admin/analytics')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: () => { this.error.set('Failed to load analytics.'); this.loading.set(false); },
      });

    this.http.get<ChartsDto>('/api/admin/analytics/charts')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => { this.chartData.set(d); this.chartLoading.set(false); },
        error: () => { this.chartError.set('Failed to load chart data.'); this.chartLoading.set(false); },
      });
  }
}
