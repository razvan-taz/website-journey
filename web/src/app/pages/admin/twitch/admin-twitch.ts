import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService, TwitchStatus } from '../../../services/site.service';

@Component({
  selector: 'app-admin-twitch',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-twitch.html',
  styleUrl: './admin-twitch.css',
})
export class AdminTwitch {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  status = signal<TwitchStatus>({ enabled: false, url: '', live: false });
  loading = signal(true);
  saving = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.siteService.getAdminTwitchStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.status.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Twitch status.');
          this.loading.set(false);
        },
      });
  }

  save(): void {
    this.saving.set(true);
    this.success.set(false);
    this.error.set(null);
    this.siteService.updateTwitchStatus(this.status())
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

  updateField(field: keyof TwitchStatus, value: string | boolean): void {
    this.status.update(s => ({ ...s, [field]: value }));
  }
}
