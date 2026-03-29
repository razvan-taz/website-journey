import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LivePrefsService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);

  breakingNewsEnabled = signal<boolean>(this.readFromStorage('guest'));

  constructor() {
    effect(() => {
      const userId = this.authService.currentUser()?.id;
      const key = userId != null ? String(userId) : 'guest';
      this.breakingNewsEnabled.set(this.readFromStorage(key));
    });
  }

  setBreakingNews(v: boolean): void {
    this.breakingNewsEnabled.set(v);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey(), String(v));
    }
  }

  private storageKey(): string {
    const userId = this.authService.currentUser()?.id;
    return `live_breaking_news_${userId != null ? userId : 'guest'}`;
  }

  private readFromStorage(userKey: string): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;
    return localStorage.getItem(`live_breaking_news_${userKey}`) !== 'false';
  }
}
