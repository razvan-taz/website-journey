import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { SiteService } from '../../../services/site.service';

@Component({
  selector: 'app-admin-site-pages',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-site-pages.html',
  styleUrl: './admin-site-pages.css',
})
export class AdminSitePages {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  activeSlug = signal<'tos' | 'privacy'>('tos');
  tosContent = signal('');
  privacyContent = signal('');
  loading = signal(true);
  saving = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor() {
    forkJoin({
      tos: this.siteService.getAdminPage('tos'),
      privacy: this.siteService.getAdminPage('privacy'),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tos, privacy }) => {
          this.tosContent.set(tos.content);
          this.privacyContent.set(privacy.content);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load pages.');
          this.loading.set(false);
        },
      });
  }

  activeContent(): string {
    return this.activeSlug() === 'tos' ? this.tosContent() : this.privacyContent();
  }

  setActiveContent(value: string): void {
    if (this.activeSlug() === 'tos') {
      this.tosContent.set(value);
    } else {
      this.privacyContent.set(value);
    }
  }

  save(): void {
    this.saving.set(true);
    this.success.set(false);
    this.error.set(null);

    this.siteService.updatePage(this.activeSlug(), this.activeContent())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set(true);
          setTimeout(() => this.success.set(false), 3000);
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Failed to save.');
        },
      });
  }
}
