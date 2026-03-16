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

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  placeOrder(request: PlaceOrderRequest): Observable<OrderConfirmation> {
    return this.http.post<OrderConfirmation>('/api/orders', request);
  }
}
