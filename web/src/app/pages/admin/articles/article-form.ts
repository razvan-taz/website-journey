import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, CreateArticleRequest } from '../../../services/article.service';

@Component({
  selector: 'app-article-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './article-form.html',
  styleUrl: './article-form.css',
})
export class ArticleForm {
  private articleService = inject(ArticleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEdit = signal(false);
  loading = signal(false);
  loadingData = signal(false);
  error = signal<string | null>(null);

  title = signal('');
  body = signal('');
  slug = signal('');
  author = signal('');
  publishDate = signal(new Date().toISOString().split('T')[0]);
  thumbnailUrl = signal('');
  type = signal('article');
  tag = signal('');
  premium = signal(false);

  constructor() {
    const slugParam = this.route.snapshot.paramMap.get('slug');
    if (slugParam) {
      this.isEdit.set(true);
      this.loadingData.set(true);
      this.articleService.getArticleBySlug(slugParam)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (a) => {
            this.title.set(a.title);
            this.body.set(a.body);
            this.slug.set(a.slug);
            this.author.set(a.author);
            this.publishDate.set(a.publishDate ?? '');
            this.thumbnailUrl.set(a.thumbnailUrl ?? '');
            this.type.set(a.type);
            this.tag.set(a.tag ?? '');
            this.premium.set(a.premium ?? false);
            this.loadingData.set(false);
          },
          error: () => { this.error.set('Failed to load article.'); this.loadingData.set(false); }
        });
    }
  }

  autoSlug(): void {
    if (!this.isEdit()) {
      this.slug.set(
        this.title().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      );
    }
  }

  save(): void {
    this.loading.set(true);
    this.error.set(null);
    const request: CreateArticleRequest = {
      title: this.title(),
      body: this.body(),
      slug: this.slug(),
      author: this.author(),
      publishDate: this.publishDate(),
      thumbnailUrl: this.thumbnailUrl(),
      type: this.type(),
      tag: this.tag(),
      premium: this.premium(),
    };
    const call = this.isEdit()
      ? this.articleService.updateArticle(this.route.snapshot.paramMap.get('slug')!, request)
      : this.articleService.createArticle(request);

    call.subscribe({
      next: () => this.router.navigate(['/admin/articles']),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Save failed.');
        this.loading.set(false);
      }
    });
  }
}
