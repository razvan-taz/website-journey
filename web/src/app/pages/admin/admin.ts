import { Component, inject, signal, DestroyRef, computed } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebSocketService, AdminNotificationPayload } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';

export interface AdminNotification extends AdminNotificationPayload {
  id: number;
  receivedAt: Date;
  read: boolean;
  message: string;
}

const ADMIN_NAV_ITEMS = [
  { label: 'Analytics',      route: '/admin/analytics' },
  { label: 'Articles',       route: '/admin/articles' },
  { label: 'Comments',       route: '/admin/comments' },
  { label: 'Contact',        route: '/admin/contact' },
  { label: 'Email Settings', route: '/admin/email-settings' },
  { label: 'FAQ',            route: '/admin/faq' },
  { label: 'Live Status',    route: '/admin/live' },
  { label: 'Nav Control',    route: '/admin/nav-layout' },
  { label: 'Newsletter',     route: '/admin/newsletter' },
  { label: 'Orders',         route: '/admin/orders' },
  { label: 'Products',       route: '/admin/products' },
  { label: 'Refunds',        route: '/admin/refunds' },
  { label: 'Schedule',       route: '/admin/schedule' },
  { label: 'Social Links',   route: '/admin/social-links' },
  { label: 'ToS & Privacy',  route: '/admin/site-pages' },
].sort((a, b) => a.label.localeCompare(b.label));

let notifIdCounter = 0;

function buildMessage(payload: AdminNotificationPayload): string {
  switch (payload.type) {
    case 'NEW_ORDER':
      return `New order #${payload.orderId ?? '?'} — €${payload.total?.toFixed(2) ?? '?'}`;
    case 'NEW_CONTACT':
      return `New contact message from ${payload.name ?? 'unknown'}`;
    case 'NEW_REFUND_REQUEST':
      return `Refund requested for order #${payload.orderId ?? '?'}`;
    case 'LOW_STOCK':
      return `${payload.productName ?? 'Unknown product'} is low on stock (${payload.availableStock ?? 0} remaining)`;
    default:
      return 'New notification';
  }
}

function typeIcon(type: AdminNotificationPayload['type']): string {
  switch (type) {
    case 'NEW_ORDER': return '🛒';
    case 'NEW_CONTACT': return '✉️';
    case 'NEW_REFUND_REQUEST': return '↩️';
    case 'LOW_STOCK': return '⚠️';
    default: return '🔔';
  }
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private wsService = inject(WebSocketService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  notifications = signal<AdminNotification[]>([]);
  showNotifPanel = signal(false);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);
  recentNotifications = computed(() => this.notifications().slice(0, 10));

  readonly navItems = ADMIN_NAV_ITEMS;
  typeIcon = typeIcon;

  constructor() {
    if (this.authService.isAdmin()) {
      this.wsService.adminNotifications$()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            const notif: AdminNotification = {
              ...payload,
              id: ++notifIdCounter,
              receivedAt: new Date(),
              read: false,
              message: buildMessage(payload),
            };
            this.notifications.update(list => [notif, ...list]);
          },
          error: () => {},
        });
    }
  }

  toggleNotifPanel(event: Event): void {
    event.stopPropagation();
    this.showNotifPanel.update(v => !v);
  }

  markRead(id: number): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  clearAll(): void {
    this.notifications.set([]);
    this.showNotifPanel.set(false);
  }

  closePanel(): void {
    this.showNotifPanel.set(false);
  }
}
