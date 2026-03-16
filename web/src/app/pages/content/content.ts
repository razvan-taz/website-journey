import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleListItem } from '../../services/article.service';

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './content.html',
  styleUrl: './content.css',
})
export class Content {
  posts = signal<ArticleListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  currentPage = signal(0);
  hasMore = signal(false);
  loadingMore = signal(false);
  tags = signal<string[]>([]);
  selectedTag = signal<string | null>(null);

  private articleService = inject(ArticleService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.articleService.getTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (tags) => this.tags.set(tags), error: () => {} });

    this.loadPage(0, null);
  }

  selectTag(tag: string | null): void {
    if (this.selectedTag() === tag) return;
    this.selectedTag.set(tag);
    this.posts.set([]);
    this.loadPage(0, tag);
  }

  loadMore(): void {
    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);
    this.articleService
      .getArticles(nextPage, 12, this.selectedTag() ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.posts.update(existing => [...existing, ...response.content]);
          this.currentPage.set(nextPage);
          this.hasMore.set(!response.last);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }

  private loadPage(page: number, tag: string | null): void {
    this.loading.set(true);
    this.articleService
      .getArticles(page, 12, tag ?? undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.posts.set(response.content);
          this.currentPage.set(page);
          this.hasMore.set(!response.last);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load articles. Please try again later.');
          this.loading.set(false);
        },
      });
  }
}
