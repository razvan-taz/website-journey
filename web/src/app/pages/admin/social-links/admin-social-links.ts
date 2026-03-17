import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService, SocialLink } from '../../../services/site.service';

interface SocialLinkRow extends SocialLink {
  saving: boolean;
  saved: boolean;
}

@Component({
  selector: 'app-admin-social-links',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-social-links.html',
  styleUrl: './admin-social-links.css',
})
export class AdminSocialLinks {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  links = signal<SocialLinkRow[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    this.siteService.getAdminSocialLinks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.links.set(data.map(l => ({ ...l, saving: false, saved: false })));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load social links.');
          this.loading.set(false);
        },
      });
  }

  displayName(platform: string): string {
    const names: Record<string, string> = {
      TWITCH: 'Twitch',
      DISCORD: 'Discord',
      TWITTER: 'Twitter / X',
      YOUTUBE: 'YouTube',
      TIKTOK: 'TikTok',
      INSTAGRAM: 'Instagram',
    };
    return names[platform] ?? platform;
  }

  updateLink(row: SocialLinkRow): void {
    row.saving = true;
    row.saved = false;
    this.siteService.updateSocialLink(row.platform, { url: row.url, enabled: row.enabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.links.update(list =>
            list.map(l => l.platform === updated.platform
              ? { ...l, url: updated.url, enabled: updated.enabled, saving: false, saved: true }
              : l
            )
          );
          setTimeout(() => {
            this.links.update(list =>
              list.map(l => l.platform === row.platform ? { ...l, saved: false } : l)
            );
          }, 2000);
        },
        error: () => {
          this.links.update(list =>
            list.map(l => l.platform === row.platform ? { ...l, saving: false } : l)
          );
          alert('Failed to save.');
        },
      });
  }

  updateUrl(platform: string, url: string): void {
    this.links.update(list =>
      list.map(l => l.platform === platform ? { ...l, url } : l)
    );
  }

  updateEnabled(platform: string, enabled: boolean): void {
    this.links.update(list =>
      list.map(l => l.platform === platform ? { ...l, enabled } : l)
    );
  }
}
