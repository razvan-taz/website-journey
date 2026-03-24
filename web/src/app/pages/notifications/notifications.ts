import { Component, inject, signal, OnDestroy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsComponent implements OnDestroy {
  notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  notifications = signal<any[]>([]);
  loading = signal(true);

  constructor() {
    this.notificationService.getNotifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.notifications.set(data);
          this.loading.set(false);
          // Mark all reviewed immediately on page open
          this.notificationService.markAllReviewed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.notificationService.fetchUnreadCount(),
          });
        },
        error: () => this.loading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.notificationService.deleteReviewed().pipe(catchError(() => of(null))).subscribe();
  }

  notificationLink(n: any): string[] | null {
    if (n.orderId) return ['/orders', n.orderId.toString()];
    return null;
  }
}
