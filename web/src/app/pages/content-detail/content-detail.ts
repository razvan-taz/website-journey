import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { DOCUMENT, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ArticleService, ArticleDetail } from '../../services/article.service';
import { AuthService } from '../../services/auth.service';
import { UiStateService } from '../../services/ui-state.service';
import { CommentService, Comment } from '../../services/comment.service';

@Component({
  selector: 'app-content-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './content-detail.html',
  styleUrl: './content-detail.css',
})
export class ContentDetail {
  article = signal<ArticleDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  linkCopied = signal(false);

  readingTime = computed(() => {
    const article = this.article();
    if (!article) return 1;
    if (article.readingTimeMinutes != null) return article.readingTimeMinutes;
    const words = (article.body ?? '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  safeVideoUrl = computed((): SafeResourceUrl | null => {
    const url = this.article()?.videoUrl;
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private titleService = inject(Title);
  private metaService = inject(Meta);
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  isLoggedIn = this.authService.isLoggedIn;
  uiState = inject(UiStateService);

  private jsonLdScript: HTMLScriptElement | null = null;

  private commentService = inject(CommentService);
  comments = signal<Comment[]>([]);
  commentInput = signal('');
  commentSubmitting = signal(false);
  commentError = signal<string | null>(null);
  editingCommentId = signal<number | null>(null);
  editingContent = signal('');

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
          this.commentService.getArticleComments(data.id)
            .pipe(takeUntilDestroyed())
            .subscribe({ next: (c) => this.comments.set(c), error: () => {} });

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

  submitComment(): void {
    const articleId = this.article()?.id;
    if (!articleId || !this.commentInput().trim()) return;
    this.commentSubmitting.set(true);
    this.commentError.set(null);
    this.commentService.addArticleComment(articleId, this.commentInput())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.comments.update(list => [...list, c]);
          this.commentInput.set('');
          this.commentSubmitting.set(false);
        },
        error: (err) => {
          this.commentError.set(err?.error?.message ?? 'Failed to submit comment.');
          this.commentSubmitting.set(false);
        },
      });
  }

  startEdit(comment: Comment): void {
    this.editingCommentId.set(comment.id);
    this.editingContent.set(comment.content);
  }

  saveEdit(commentId: number): void {
    if (!this.editingContent().trim()) return;
    this.commentService.editComment(commentId, this.editingContent())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.comments.update(list => list.map(c => c.id === commentId ? updated : c));
          this.editingCommentId.set(null);
        },
        error: () => {},
      });
  }

  cancelEdit(): void { this.editingCommentId.set(null); }

  isCurrentUser(authorName: string): boolean {
    const user = this.authService.currentUser();
    return !!user && user.name === authorName;
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }
}
