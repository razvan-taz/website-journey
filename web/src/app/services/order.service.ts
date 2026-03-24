import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlaceOrderRequest {
  items: Array<{
    productId: number;
    name: string;
    price: number;
    quantity: number;
  }>;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  total: number;
  discountCode?: string | null;
  discountAmount?: number;
  paymentIntentId?: string;
}

export interface OrderConfirmation {
  orderId: number;
  status: string;
  total: number;
  createdAt: string;
}

export interface OrderItem {
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderSummary {
  orderId: number;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export interface ShippingAddress {
  name: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface OrderDetail {
  orderId: number;
  status: string;
  total: number;
  discountAmount: number;
  discountCode: string | null;
  createdAt: string;
  updatedAt: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  placeOrder(request: PlaceOrderRequest): Observable<OrderConfirmation> {
    return this.http.post<OrderConfirmation>('/api/orders', request);
  }

  getMyOrders(): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>('/api/orders/mine');
  }

  getOrderDetail(orderId: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`/api/orders/mine/${orderId}`);
  }

  submitRefundRequest(orderId: number, reason: string): Observable<any> {
    return this.http.post<any>(`/api/orders/${orderId}/refund-request`, { reason });
  }
}
