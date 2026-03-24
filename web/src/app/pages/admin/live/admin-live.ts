import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService, LiveStatus } from '../../../services/site.service';

@Component({
  selector: 'app-admin-live',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-live.html',
  styleUrl: './admin-live.css',
})
export class AdminLive {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  status = signal<LiveStatus>({ enabled: false, url: '', live: false });
  loading = signal(true);
  saving = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.siteService.getAdminLiveStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.status.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load live status.');
          this.loading.set(false);
        },
      });
  }

  save(): void {
    this.saving.set(true);
    this.success.set(false);
    this.error.set(null);
    this.siteService.updateLiveStatus(this.status())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.status.set(data);
          this.saving.set(false);
          this.success.set(true);
          setTimeout(() => this.success.set(false), 3000);
        },
        error: () => {
          this.error.set('Failed to save.');
          this.saving.set(false);
        },
      });
  }

  updateField(field: keyof LiveStatus, value: string | boolean): void {
    this.status.update(s => ({ ...s, [field]: value }));
  }
}
