import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleListItem } from '../../../services/article.service';

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

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.articleService.getArticles(0, 100)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (r) => { this.articles.set(r.content); this.loading.set(false); },
        error: () => { this.error.set('Failed to load.'); this.loading.set(false); }
      });
  }

  delete(slug: string): void {
    if (!confirm(`Delete "${slug}"?`)) return;
    this.deleting.set(slug);
    this.articleService.deleteArticle(slug).subscribe({
      next: () => { this.articles.update(list => list.filter(a => a.slug !== slug)); this.deleting.set(null); },
      error: () => { alert('Delete failed.'); this.deleting.set(null); }
    });
  }
}
