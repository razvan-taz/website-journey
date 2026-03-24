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
  startTime: string;
  endTime: string;
  description: string;
}

export interface SitePage {
  slug: string;
  content: string;
  updatedAt: string;
}

export interface LiveStatus {
  enabled: boolean;
  url: string;
  live: boolean;
}

@Injectable({ providedIn: 'root' })
export class SiteService {
  private http = inject(HttpClient);

  liveStatus = signal<LiveStatus | null>(null);

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

  updateSchedule(rows: { rows: Array<{ dayOfWeek: number; startTime: string; endTime: string; description: string }> }): Observable<ScheduleEntry[]> {
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

  getLiveStatus(): Observable<LiveStatus> {
    return this.http.get<LiveStatus>('/api/site/live-status').pipe(
      tap(s => this.liveStatus.set(s))
    );
  }

  getAdminLiveStatus(): Observable<LiveStatus> {
    return this.http.get<LiveStatus>('/api/admin/live-status');
  }

  updateLiveStatus(data: LiveStatus): Observable<LiveStatus> {
    return this.http.put<LiveStatus>('/api/admin/live-status', data).pipe(
      tap(s => this.liveStatus.set(s))
    );
  }
}
