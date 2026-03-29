import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export interface AdminOrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface AdminOrder {
  orderId: number;
  customerEmail: string;
  items: AdminOrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  trackingNumber?: string | null;
}

export interface AdminOrderPageResponse {
  content: AdminOrder[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private http = inject(HttpClient);

  getOrders(
    page: number,
    size: number,
    status?: OrderStatus | 'ALL'
  ): Observable<AdminOrderPageResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      size: size.toString(),
    };
    if (status && status !== 'ALL') params['status'] = status;
    return this.http.get<AdminOrderPageResponse>('/api/admin/orders', { params });
  }

  updateOrderStatus(orderId: number, status: OrderStatus): Observable<AdminOrder> {
    return this.http.put<AdminOrder>(`/api/admin/orders/${orderId}/status`, { status });
  }

  setTrackingNumber(orderId: number, trackingNumber: string): Observable<AdminOrder> {
    return this.http.put<AdminOrder>(`/api/admin/orders/${orderId}/tracking`, { trackingNumber });
  }

  bulkUpdateStatus(orderIds: number[], status: OrderStatus): Observable<AdminOrder[]> {
    return this.http.put<AdminOrder[]>(`/api/admin/orders/bulk-status`, { orderIds, status });
  }
}
