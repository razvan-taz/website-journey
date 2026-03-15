import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleDetail } from '../../services/article.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-content-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './content-detail.html',
  styleUrl: './content-detail.css',
})
export class ContentDetail {
  article = signal<ArticleDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private titleService = inject(Title);
  private metaService = inject(Meta);
  private authService = inject(AuthService);
  isLoggedIn = this.authService.isLoggedIn;

  constructor() {
    const route = inject(ActivatedRoute);
    const articleService = inject(ArticleService);

    const slug = route.snapshot.paramMap.get('id') ?? '';

    articleService
      .getArticleBySlug(slug)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (data) => {
          this.article.set(data);
          this.loading.set(false);

          const seo = data.seo;
          this.titleService.setTitle(seo.metaTitle);
          this.metaService.updateTag({ name: 'description', content: seo.metaDescription });
          this.metaService.updateTag({ property: 'og:title', content: seo.metaTitle });
          this.metaService.updateTag({ property: 'og:description', content: seo.metaDescription });
          if (seo.ogImage) {
            this.metaService.updateTag({ property: 'og:image', content: seo.ogImage });
          }
        },
        error: (err) => {
          if (err.status === 404) {
            this.error.set('not-found');
          } else {
            this.error.set('server-error');
          }
          this.loading.set(false);
        },
      });
  }
}
