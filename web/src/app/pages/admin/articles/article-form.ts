import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuillModule } from 'ngx-quill';
import { ArticleService, CreateArticleRequest, ArticleListItem, ArticleCategory } from '../../../services/article.service';
import { UploadService } from '../../../services/upload.service';

const QUILL_TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'blockquote'],
  ['clean'],
];

const AUTO_SAVE_INTERVAL_MS = 3_000;

@Component({
  selector: 'app-article-form',
  standalone: true,
  imports: [FormsModule, RouterLink, QuillModule],
  templateUrl: './article-form.html',
  styleUrl: './article-form.css',
})
export class ArticleForm implements OnDestroy {
  private articleService = inject(ArticleService);
  private uploadService = inject(UploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEdit = signal(false);
  loading = signal(false);
  loadingData = signal(false);
  uploading = signal(false);
  uploadError = signal<string | null>(null);
  error = signal<string | null>(null);
  draftSavedVisible = signal(false);

  title = signal('');
  body = signal('');
  slug = signal('');
  author = signal('');
  publishDate = signal(new Date().toISOString().split('T')[0]);
  thumbnailUrl = signal('');
  videoUrl = signal<string | null>(null);
  breakingNews = signal(false);
  category = signal<ArticleCategory | null>(null);
  tags = signal<string>('');
  status = signal<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('PUBLISHED');
  scheduledAt = signal<string>('');

  showDraftPanel = signal(false);
  draftArticles = signal<ArticleListItem[]>([]);
  deletingDraftSlug = signal<string | null>(null);

  // Track whether form has unsaved changes for auto-save
  private lastSavedTitle = '';
  private lastSavedBody = '';
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private draftSavedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly quillModules = { toolbar: QUILL_TOOLBAR };

  constructor() {
    const slugParam = this.route.snapshot.paramMap.get('slug');
    if (slugParam) {
      this.isEdit.set(true);
      this.loadingData.set(true);
      this.articleService.getArticleBySlugAdmin(slugParam)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (a) => {
            this.title.set(a.title);
            this.body.set(a.body);
            this.slug.set(a.slug);
            this.author.set(a.author);
            this.publishDate.set(a.publishDate ?? '');
            this.thumbnailUrl.set(a.thumbnailUrl ?? '');
            this.videoUrl.set(a.videoUrl ?? null);
            this.breakingNews.set(a.breakingNews ?? false);
            this.category.set(a.category ?? null);
            this.tags.set(a.tags ?? '');
            this.status.set(a.status ?? 'PUBLISHED');
            this.scheduledAt.set(a.scheduledAt ?? '');
            this.loadingData.set(false);
            this.lastSavedTitle = a.title;
            this.lastSavedBody = a.body;
          },
          error: () => { this.error.set('Failed to load article.'); this.loadingData.set(false); }
        });
    }

    this.autoSaveTimer = setInterval(() => this.autoSave(), AUTO_SAVE_INTERVAL_MS);

    if (!this.isEdit()) {
      this.articleService.getArticlesAdmin(0, 100)
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (r) => this.draftArticles.set(r.content.filter(a => a.status === 'DRAFT')),
          error: () => {},
        });
    }
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer !== null) clearInterval(this.autoSaveTimer);
    if (this.draftSavedTimer !== null) clearTimeout(this.draftSavedTimer);
  }

  toggleDraftPanel(): void {
    this.showDraftPanel.update(v => !v);
  }

  loadDraft(slug: string): void {
    this.router.navigate(['/admin/articles/edit', slug]);
  }

  deleteDraft(slug: string): void {
    if (!confirm('Delete this draft?')) return;
    this.deletingDraftSlug.set(slug);
    this.articleService.deleteArticle(slug).subscribe({
      next: () => {
        this.draftArticles.update(list => list.filter(d => d.slug !== slug));
        this.deletingDraftSlug.set(null);
        if (this.draftArticles().length === 0) this.showDraftPanel.set(false);
      },
      error: () => this.deletingDraftSlug.set(null),
    });
  }

  autoSlug(): void {
    if (!this.isEdit()) {
      this.slug.set(
        this.title().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      );
    }
  }

  onBodyChange(content: string): void {
    this.body.set(content);
  }

  private hasUnsavedChanges(): boolean {
    return this.title() !== this.lastSavedTitle || this.body() !== this.lastSavedBody;
  }

  private autoSave(): void {
    if (!this.title().trim()) return;
    if (!this.hasUnsavedChanges()) return;
    if (this.loading()) return;

    const request = this.buildRequest('DRAFT');
    const call = this.isEdit()
      ? this.articleService.updateArticle(this.route.snapshot.paramMap.get('slug')!, request)
      : this.articleService.createArticle(request);

    call.subscribe({
      next: () => {
        this.lastSavedTitle = this.title();
        this.lastSavedBody = this.body();
        this.showDraftSaved();
      },
      error: () => { /* silent auto-save failure */ }
    });
  }

  private showDraftSaved(): void {
    this.draftSavedVisible.set(true);
    if (this.draftSavedTimer !== null) clearTimeout(this.draftSavedTimer);
    this.draftSavedTimer = setTimeout(() => this.draftSavedVisible.set(false), 2000);
  }

  private buildRequest(status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'): CreateArticleRequest {
    return {
      title: this.title(),
      body: this.body(),
      slug: this.slug(),
      author: this.author(),
      publishDate: this.publishDate(),
      thumbnailUrl: this.thumbnailUrl(),
      videoUrl: this.videoUrl() || null,
      type: this.category() === 'VIDEO' ? 'video' : 'article',
      tag: null,
      breakingNews: this.breakingNews(),
      category: this.category(),
      tags: this.tags() || null,
      status,
      scheduledAt: status === 'SCHEDULED' ? this.scheduledAt() || null : null,
    };
  }

  onThumbnailFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const validationError = this.uploadService.validate(file);
    if (validationError) {
      this.uploadError.set(validationError);
      input.value = '';
      return;
    }
    this.uploadError.set(null);
    this.uploading.set(true);
    this.uploadService.uploadImage(file).subscribe({
      next: (res) => {
        this.thumbnailUrl.set(res.url);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.uploadError.set('Upload failed. Please try again.');
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  saveDraft(): void {
    this.loading.set(true);
    this.error.set(null);
    const request = this.buildRequest('DRAFT');
    const call = this.isEdit()
      ? this.articleService.updateArticle(this.route.snapshot.paramMap.get('slug')!, request)
      : this.articleService.createArticle(request);

    call.subscribe({
      next: (saved) => {
        this.lastSavedTitle = this.title();
        this.lastSavedBody = this.body();
        this.loading.set(false);
        // If newly created, switch to edit mode with the returned slug
        if (!this.isEdit()) {
          this.router.navigate(['/admin/articles/edit', saved.slug], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Save failed.');
        this.loading.set(false);
      }
    });
  }

  save(): void {
    this.loading.set(true);
    this.error.set(null);
    const request = this.buildRequest(this.status());
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
