import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RefundRequest {
  id: number;
  orderId: number;
  userEmail: string;
  reason: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface RefundPage {
  content: RefundRequest[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class RefundService {
  private http = inject(HttpClient);

  requestRefund(orderId: number, reason: string): Observable<void> {
    return this.http.post<void>(`/api/orders/${orderId}/refund-request`, { reason });
  }

  getRefunds(status: string = '', page: number = 0, size: number = 20): Observable<RefundPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) params = params.set('status', status);
    return this.http.get<RefundPage>('/api/admin/refunds', { params });
  }

  approveRefund(id: number): Observable<void> {
    return this.http.post<void>(`/api/admin/refunds/${id}/approve`, {});
  }

  rejectRefund(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`/api/admin/refunds/${id}/reject`, { reason });
  }
}
