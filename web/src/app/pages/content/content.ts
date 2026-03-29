import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleListItem, ArticleCategory } from '../../services/article.service';

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: 'NEWS', label: 'News' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'ARTICLE', label: 'Article' },
  { value: 'VIDEO', label: 'Video' },
];

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [RouterLink, DatePipe],
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
  selectedCategory = signal<ArticleCategory | null>(null);
  categories = CATEGORIES;

  private articleService = inject(ArticleService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor() {
    this.articleService.getTags()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (tags) => this.tags.set(tags), error: () => {} });

    // Read state from route params (legacy path-based) then query params
    const catParam = this.route.snapshot.paramMap.get('cat') as ArticleCategory | null;
    const tagParam = this.route.snapshot.paramMap.get('tag');
    const qp = this.route.snapshot.queryParams;
    const initCategory = (catParam ?? qp['category'] ?? null) as ArticleCategory | null;
    const initTag = tagParam ?? qp['tag'] ?? null;

    if (initCategory) this.selectedCategory.set(initCategory.toUpperCase() as ArticleCategory);
    if (initTag) this.selectedTag.set(initTag);

    this.loadPage(0, this.selectedTag(), this.selectedCategory());
  }

  selectTag(tag: string | null): void {
    if (this.selectedTag() === tag) return;
    this.selectedTag.set(tag);
    this.syncUrl();
    this.posts.set([]);
    this.loadPage(0, tag, this.selectedCategory());
  }

  selectCategory(cat: ArticleCategory | null): void {
    if (this.selectedCategory() === cat) return;
    this.selectedCategory.set(cat);
    this.syncUrl();
    this.posts.set([]);
    this.loadPage(0, this.selectedTag(), cat);
  }

  loadMore(): void {
    const nextPage = this.currentPage() + 1;
    this.loadingMore.set(true);
    this.articleService
      .getArticles(nextPage, 12, this.selectedTag() ?? undefined, this.selectedCategory() ?? undefined)
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

  categoryLabel(cat: ArticleCategory | null): string {
    if (!cat) return '';
    return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  private syncUrl(): void {
    const params: Record<string, string> = {};
    if (this.selectedCategory()) params['category'] = this.selectedCategory()!;
    if (this.selectedTag()) params['tag'] = this.selectedTag()!;
    void this.router.navigate(['/content'], { queryParams: params, replaceUrl: true });
  }

  private loadPage(page: number, tag: string | null, category: ArticleCategory | null): void {
    this.loading.set(true);
    this.articleService
      .getArticles(page, 12, tag ?? undefined, category ?? undefined)
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
