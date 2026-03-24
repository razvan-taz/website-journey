import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleListItem } from '../../../services/article.service';

@Component({
  selector: 'app-admin-articles-analytics',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-articles-analytics.html',
  styleUrl: './admin-articles-analytics.css',
})
export class AdminArticlesAnalytics {
  private articleService = inject(ArticleService);

  loading = signal(true);
  error = signal<string | null>(null);
  articles = signal<ArticleListItem[]>([]);

  readonly ranked = computed(() =>
    [...this.articles()].sort((a, b) => b.viewCount - a.viewCount)
  );

  constructor() {
    this.articleService.getArticlesAdmin(0, 500)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => {
          this.articles.set(r.content.filter(a => a.status === 'PUBLISHED'));
          this.loading.set(false);
        },
        error: () => { this.error.set('Failed to load.'); this.loading.set(false); }
      });
  }

  formatHits(n: number): string {
    if (n < 10_000) return n.toString();
    if (n < 1_000_000) return `${Math.floor(n / 1_000)}k`;
    const tenths = Math.floor(n / 100_000);
    return tenths % 10 === 0 ? `${tenths / 10}M` : `${(tenths / 10).toFixed(1)}M`;
  }
}
