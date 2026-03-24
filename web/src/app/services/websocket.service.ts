import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RxStomp, RxStompConfig } from '@stomp/rx-stomp';
import { Observable, EMPTY } from 'rxjs';
import { map, filter } from 'rxjs/operators';

export interface WsEnvelope<T> {
  type: string;
  timestamp: string;
  payload: T;
}

export interface OrderStatusPayload {
  orderId: number;
  status: string;
  updatedAt: string;
}

export interface StockUpdatePayload {
  productId: number;
  availableStock: number;
}

export type AdminNotificationType = 'NEW_ORDER' | 'NEW_CONTACT' | 'NEW_REFUND_REQUEST' | 'LOW_STOCK';

export interface AdminNotificationPayload {
  type: AdminNotificationType;
  orderId?: number;
  total?: number;
  name?: string;
  productName?: string;
  availableStock?: number;
}

export interface BreakingNewsPayload {
  articleId: number;
  title: string;
  slug: string;
  summary: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private platformId = inject(PLATFORM_ID);
  private rxStomp = new RxStomp();
  private connected = false;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.connect();
  }

  private connect(): void {
    // Dynamic import of SockJS to avoid SSR issues
    import('sockjs-client').then((SockJSModule) => {
      const SockJS = SockJSModule.default;
      const config: RxStompConfig = {
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        reconnectDelay: 5000,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 20000,
      };
      this.rxStomp.configure(config);
      this.rxStomp.activate();
      this.connected = true;
    });
  }

  private watch$<T>(topic: string): Observable<T> {
    if (!isPlatformBrowser(this.platformId)) return EMPTY;
    return this.rxStomp.watch(topic).pipe(
      map((msg) => JSON.parse(msg.body) as WsEnvelope<T>),
      filter((env) => !!env && !!env.payload),
      map((env) => env.payload),
    );
  }

  orderStatus$(orderId: string | number): Observable<OrderStatusPayload> {
    return this.watch$<OrderStatusPayload>(`/topic/orders/${orderId}/status`);
  }

  stockUpdates$(): Observable<StockUpdatePayload> {
    return this.watch$<StockUpdatePayload>('/topic/inventory/stock-updated');
  }

  adminNotifications$(): Observable<AdminNotificationPayload> {
    return this.watch$<AdminNotificationPayload>('/topic/admin/notifications');
  }

  breakingNews$(): Observable<BreakingNewsPayload> {
    return this.watch$<BreakingNewsPayload>('/topic/news/published');
  }

  deactivate(): void {
    if (this.connected) {
      this.rxStomp.deactivate();
    }
  }
}
