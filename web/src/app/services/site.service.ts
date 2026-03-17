import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface SocialLink {
  platform: string;
  url: string;
  enabled: boolean;
}

export interface ScheduleEntry {
  dayOfWeek: number;
  dayName: string;
  content: string;
}

export interface SitePage {
  slug: string;
  content: string;
  updatedAt: string;
}

export interface TwitchStatus {
  enabled: boolean;
  url: string;
  live: boolean;
}

@Injectable({ providedIn: 'root' })
export class SiteService {
  private http = inject(HttpClient);

  twitchStatus = signal<TwitchStatus | null>(null);

  getSocialLinks(): Observable<SocialLink[]> {
    return this.http.get<SocialLink[]>('/api/site/social-links');
  }

  getAdminSocialLinks(): Observable<SocialLink[]> {
    return this.http.get<SocialLink[]>('/api/admin/social-links');
  }

  updateSocialLink(platform: string, data: { url: string; enabled: boolean }): Observable<SocialLink> {
    return this.http.put<SocialLink>(`/api/admin/social-links/${platform}`, data);
  }

  getSchedule(): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>('/api/site/schedule');
  }

  getAdminSchedule(): Observable<ScheduleEntry[]> {
    return this.http.get<ScheduleEntry[]>('/api/admin/schedule');
  }

  updateSchedule(rows: { rows: Array<{ dayOfWeek: number; content: string }> }): Observable<ScheduleEntry[]> {
    return this.http.put<ScheduleEntry[]>('/api/admin/schedule', rows);
  }

  getPage(slug: string): Observable<SitePage> {
    return this.http.get<SitePage>(`/api/site/pages/${slug}`);
  }

  getAdminPage(slug: string): Observable<SitePage> {
    return this.http.get<SitePage>(`/api/admin/pages/${slug}`);
  }

  updatePage(slug: string, content: string): Observable<SitePage> {
    return this.http.put<SitePage>(`/api/admin/pages/${slug}`, { content });
  }

  getTwitchStatus(): Observable<TwitchStatus> {
    return this.http.get<TwitchStatus>('/api/site/twitch-status').pipe(
      tap(s => this.twitchStatus.set(s))
    );
  }

  getAdminTwitchStatus(): Observable<TwitchStatus> {
    return this.http.get<TwitchStatus>('/api/admin/twitch-status');
  }

  updateTwitchStatus(data: TwitchStatus): Observable<TwitchStatus> {
    return this.http.put<TwitchStatus>('/api/admin/twitch-status', data).pipe(
      tap(s => this.twitchStatus.set(s))
    );
  }
}
