import { Component, inject, signal, computed, OnDestroy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { LivePrefsService } from '../../services/live-prefs.service';

interface Notification {
  id: number;
  message: string;
  reviewed: boolean;
  createdAt: string;
  orderId: number | null;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsComponent implements OnDestroy {
  private notificationService = inject(NotificationService);
  livePrefs = inject(LivePrefsService);
  private destroyRef = inject(DestroyRef);

  notifications = signal<Notification[]>([]);
  loading = signal(true);

  hasUnread = computed(() => this.notifications().some(n => !n.reviewed));

  constructor() {
    this.notificationService.getNotifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.notifications.set(data);
          this.loading.set(false);
          this.notificationService.markAllReviewed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.notifications.update(list => list.map(n => ({ ...n, reviewed: true })));
              this.notificationService.fetchUnreadCount();
            },
            error: () => {
              // Backend mark-as-read failed — local state is unchanged (still shows unread correctly)
            },
          });
        },
        error: () => this.loading.set(false),
      });
  }

  markAllAsRead(): void {
    const snapshot = this.notifications();
    this.notifications.update(list => list.map(n => ({ ...n, reviewed: true })));
    this.notificationService.markAllReviewed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.notificationService.fetchUnreadCount(),
        error: () => this.notifications.set(snapshot), // revert on failure
      });
  }

  ngOnDestroy(): void {
    this.notificationService.deleteReviewed().pipe(catchError(() => of(null))).subscribe();
  }

  notificationLink(n: Notification): string[] | null {
    if (n.orderId) return ['/orders', n.orderId.toString()];
    return null;
  }
}
