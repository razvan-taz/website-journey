import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribedAt: string;
}

export interface NewsletterPageResponse {
  content: NewsletterSubscriber[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface NewsletterDraft {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private http = inject(HttpClient);

  // ── Subscribers ────────────────────────────────────────────────

  getSubscribers(page: number, size: number): Observable<NewsletterPageResponse> {
    return this.http.get<NewsletterPageResponse>('/api/admin/newsletter/subscribers', {
      params: { page: page.toString(), size: size.toString() },
    });
  }

  removeSubscriber(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/newsletter/subscribers/${id}`);
  }

  // ── Send ───────────────────────────────────────────────────────

  sendNewsletter(subject: string, body: string): Observable<{ recipientCount: number }> {
    return this.http.post<{ recipientCount: number }>('/api/admin/newsletter/send', { subject, body });
  }

  // ── Drafts ─────────────────────────────────────────────────────

  getDrafts(): Observable<NewsletterDraft[]> {
    return this.http.get<NewsletterDraft[]>('/api/admin/newsletter/drafts');
  }

  createDraft(subject: string, body: string): Observable<NewsletterDraft> {
    return this.http.post<NewsletterDraft>('/api/admin/newsletter/drafts', { subject, body });
  }

  updateDraft(id: number, subject: string, body: string): Observable<NewsletterDraft> {
    return this.http.put<NewsletterDraft>(`/api/admin/newsletter/drafts/${id}`, { subject, body });
  }

  deleteDraft(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/newsletter/drafts/${id}`);
  }

  exportSubscribersCsv(): void {
    this.http.get('/api/admin/newsletter/subscribers/export', { responseType: 'blob' })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'subscribers.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  }
}
