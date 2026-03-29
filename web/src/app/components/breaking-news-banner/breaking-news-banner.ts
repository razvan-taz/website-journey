import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebSocketService, BreakingNewsPayload } from '../../services/websocket.service';
import { LivePrefsService } from '../../services/live-prefs.service';

@Component({
  selector: 'app-breaking-news-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './breaking-news-banner.html',
  styleUrl: './breaking-news-banner.css',
})
export class BreakingNewsBanner {
  private wsService = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);
  livePrefs = inject(LivePrefsService);

  article = signal<BreakingNewsPayload | null>(null);
  dismissed = signal(false);

  constructor() {
    this.wsService.breakingNews$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          if (!this.livePrefs.breakingNewsEnabled()) return;
          this.article.set(payload);
          this.dismissed.set(false);
        },
        error: () => {},
      });
  }

  dismiss(): void {
    this.dismissed.set(true);
  }
}
