import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface NotificationItem {
  id: number;
  message: string;
  type: string;
  orderId: number | null;
  reviewed: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  unreadCount = signal(0);

  getNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>('/api/notifications');
  }

  markAllReviewed(): Observable<void> {
    return this.http.post<void>('/api/notifications/mark-reviewed', {});
  }

  deleteReviewed(): Observable<void> {
    return this.http.delete<void>('/api/notifications/reviewed');
  }

  fetchUnreadCount(): void {
    this.http.get<{ count: number }>('/api/notifications/unread-count').subscribe({
      next: (r) => this.unreadCount.set(r.count),
      error: () => {},
    });
  }
}
