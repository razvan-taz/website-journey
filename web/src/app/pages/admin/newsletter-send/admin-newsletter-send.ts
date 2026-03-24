import { Component, inject, signal, DestroyRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewsletterService, NewsletterDraft } from '../../../services/newsletter.service';

const AUTO_SAVE_INTERVAL_MS = 3_000;

@Component({
  selector: 'app-admin-newsletter-send',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './admin-newsletter-send.html',
  styleUrl: './admin-newsletter-send.css',
})
export class AdminNewsletterSend implements OnDestroy {
  private newsletterService = inject(NewsletterService);
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);

  subject = signal('');
  body = signal('');
  showPreview = signal(false);

  sending = signal(false);
  savingDraft = signal(false);
  deletingDraftId = signal<number | null>(null);

  successMessage = signal<string | null>(null);
  error = signal<string | null>(null);

  drafts = signal<NewsletterDraft[]>([]);
  loadedDraftId = signal<number | null>(null);
  showDraftPanel = signal(false);

  private lastSavedSubject = '';
  private lastSavedBody = '';
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadDrafts();
    this.autoSaveTimer = setInterval(() => this.autoSave(), AUTO_SAVE_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer !== null) clearInterval(this.autoSaveTimer);
  }

  openPreview(): void { this.showPreview.set(true); }
  closePreview(): void { this.showPreview.set(false); }

  previewHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.body());
  }

  setSubject(value: string): void {
    this.subject.set(value);
  }

  setBody(value: string): void {
    this.body.set(value);
  }

  private hasUnsavedChanges(): boolean {
    return this.subject() !== this.lastSavedSubject || this.body() !== this.lastSavedBody;
  }

  private autoSave(): void {
    if (!this.subject().trim() && !this.body().trim()) return;
    if (!this.hasUnsavedChanges()) return;
    if (this.savingDraft() || this.sending()) return;

    const id = this.loadedDraftId();
    const op = id
      ? this.newsletterService.updateDraft(id, this.subject(), this.body())
      : this.newsletterService.createDraft(this.subject(), this.body());

    op.subscribe({
      next: (draft) => {
        this.lastSavedSubject = this.subject();
        this.lastSavedBody = this.body();
        this.loadedDraftId.set(draft.id);
        this.drafts.update(list => {
          const idx = list.findIndex(d => d.id === draft.id);
          return idx >= 0
            ? [draft, ...list.filter(d => d.id !== draft.id)]
            : [draft, ...list];
        });
      },
      error: () => {},
    });
  }

  private loadDrafts(): void {
    this.newsletterService.getDrafts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (drafts) => this.drafts.set(drafts),
        error: () => {},
      });
  }

  toggleDraftPanel(): void {
    this.showDraftPanel.update(v => !v);
  }

  loadDraft(draft: NewsletterDraft): void {
    this.subject.set(draft.subject);
    this.body.set(draft.body);
    this.loadedDraftId.set(draft.id);
    this.lastSavedSubject = draft.subject;
    this.lastSavedBody = draft.body;
    this.showDraftPanel.set(false);
    this.successMessage.set(null);
    this.error.set(null);
  }

  newDraft(): void {
    this.subject.set('');
    this.body.set('');
    this.loadedDraftId.set(null);
    this.lastSavedSubject = '';
    this.lastSavedBody = '';
    this.successMessage.set(null);
    this.error.set(null);
  }

  saveDraft(): void {
    if (!this.subject().trim() && !this.body().trim()) return;
    this.savingDraft.set(true);
    this.successMessage.set(null);
    this.error.set(null);

    const id = this.loadedDraftId();
    const op = id
      ? this.newsletterService.updateDraft(id, this.subject(), this.body())
      : this.newsletterService.createDraft(this.subject(), this.body());

    op.subscribe({
      next: (draft) => {
        this.lastSavedSubject = this.subject();
        this.lastSavedBody = this.body();
        this.loadedDraftId.set(draft.id);
        this.drafts.update(list => {
          const idx = list.findIndex(d => d.id === draft.id);
          return idx >= 0
            ? [draft, ...list.filter(d => d.id !== draft.id)]
            : [draft, ...list];
        });
        this.successMessage.set('Draft saved.');
        this.savingDraft.set(false);
      },
      error: () => {
        this.error.set('Failed to save draft.');
        this.savingDraft.set(false);
      },
    });
  }

  deleteDraft(id: number): void {
    if (!confirm('Delete this draft?')) return;
    this.deletingDraftId.set(id);
    this.newsletterService.deleteDraft(id).subscribe({
      next: () => {
        this.drafts.update(list => list.filter(d => d.id !== id));
        if (this.loadedDraftId() === id) {
          this.loadedDraftId.set(null);
          this.lastSavedSubject = '';
          this.lastSavedBody = '';
        }
        this.deletingDraftId.set(null);
      },
      error: () => this.deletingDraftId.set(null),
    });
  }

  send(): void {
    if (!this.subject().trim() || !this.body().trim()) return;
    this.sending.set(true);
    this.successMessage.set(null);
    this.error.set(null);

    this.newsletterService.sendNewsletter(this.subject(), this.body()).subscribe({
      next: (res) => {
        this.successMessage.set(`Sent to ${res.recipientCount} subscriber${res.recipientCount !== 1 ? 's' : ''}.`);
        this.subject.set('');
        this.body.set('');
        this.loadedDraftId.set(null);
        this.lastSavedSubject = '';
        this.lastSavedBody = '';
        this.sending.set(false);
      },
      error: () => {
        this.error.set('Failed to send newsletter. Please try again.');
        this.sending.set(false);
      },
    });
  }
}
