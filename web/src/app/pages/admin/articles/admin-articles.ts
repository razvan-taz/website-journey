import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleListItem } from '../../../services/article.service';

type StatusTab = 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';

@Component({
  selector: 'app-admin-articles',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-articles.html',
  styleUrl: './admin-articles.css',
})
export class AdminArticles {
  private articleService = inject(ArticleService);
  articles = signal<ArticleListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  deleting = signal<string | null>(null);
  activeTab = signal<StatusTab>('PUBLISHED');
  searchQuery = signal('');

  readonly filteredArticles = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.articles()
      .filter(a => a.status === this.activeTab())
      .filter(a => !q || a.title.toLowerCase().includes(q));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.articleService.getArticlesAdmin(0, 200)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => { this.articles.set(r.content); this.loading.set(false); },
        error: () => { this.error.set('Failed to load.'); this.loading.set(false); }
      });
  }

  setTab(tab: StatusTab): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  delete(slug: string): void {
    if (!confirm(`Delete "${slug}"?`)) return;
    this.deleting.set(slug);
    this.articleService.deleteArticle(slug).subscribe({
      next: () => { this.articles.update(list => list.filter(a => a.slug !== slug)); this.deleting.set(null); },
      error: () => { alert('Delete failed.'); this.deleting.set(null); }
    });
  }

  formatHits(n: number): string {
    if (n < 10_000) return n.toString();
    if (n < 1_000_000) return `${Math.floor(n / 1_000)}k`;
    const tenths = Math.floor(n / 100_000);
    if (tenths % 10 === 0) return `${tenths / 10}M`;
    return `${(tenths / 10).toFixed(1)}M`;
  }
}
