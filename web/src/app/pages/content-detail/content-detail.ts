import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleDetail } from '../../services/article.service';
import { AuthService } from '../../services/auth.service';
import { UiStateService } from '../../services/ui-state.service';

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

  readingTime = computed(() => {
    const body = this.article()?.body;
    if (!body) return 1;
    const words = body.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  private titleService = inject(Title);
  private metaService = inject(Meta);
  private authService = inject(AuthService);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  isLoggedIn = this.authService.isLoggedIn;
  uiState = inject(UiStateService);

  private jsonLdScript: HTMLScriptElement | null = null;

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
          this.metaService.updateTag({ property: 'og:type', content: 'article' });

          this.metaService.updateTag({ name: 'twitter:card', content: seo.ogImage ? 'summary_large_image' : 'summary' });
          this.metaService.updateTag({ name: 'twitter:title', content: seo.metaTitle });
          this.metaService.updateTag({ name: 'twitter:description', content: seo.metaDescription });
          if (seo.ogImage) {
            this.metaService.updateTag({ name: 'twitter:image', content: seo.ogImage });
          }
          if (seo.canonicalUrl) {
            this.metaService.updateTag({ property: 'og:url', content: seo.canonicalUrl });
          }
          if (seo.ogImage) {
            this.metaService.updateTag({ property: 'og:image', content: seo.ogImage });
          }

          if (seo.canonicalUrl) {
            let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
            if (!canonical) {
              canonical = this.document.createElement('link');
              canonical.setAttribute('rel', 'canonical');
              this.document.head.appendChild(canonical);
            }
            canonical.setAttribute('href', seo.canonicalUrl);
          }

          const jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: seo.metaTitle,
            description: seo.metaDescription,
            author: {
              '@type': 'Person',
              name: seo.author,
            },
            datePublished: seo.publishDate,
            ...(seo.ogImage ? { image: seo.ogImage } : {}),
            ...(seo.canonicalUrl ? { url: seo.canonicalUrl } : {}),
          };

          this.jsonLdScript = this.document.createElement('script');
          this.jsonLdScript.type = 'application/ld+json';
          this.jsonLdScript.text = JSON.stringify(jsonLd);
          this.document.head.appendChild(this.jsonLdScript);
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

    this.destroyRef.onDestroy(() => {
      if (this.jsonLdScript) {
        this.jsonLdScript.remove();
        this.jsonLdScript = null;
      }
    });
  }
}
