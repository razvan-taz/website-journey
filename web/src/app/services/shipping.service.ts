import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ShippingRate {
  price: number;
  currency: string;
}

export interface ShippingConfig {
  id: number;
  price: number;
  currency: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ShippingService {
  constructor(private http: HttpClient) {}

  getShippingRate(): Observable<ShippingRate> {
    return this.http.get<ShippingRate>('/api/shipping/rate');
  }

  getShippingConfig(): Observable<ShippingConfig> {
    return this.http.get<ShippingConfig>('/api/admin/shipping-config');
  }

  updateShippingConfig(price: number, currency: string): Observable<ShippingConfig> {
    return this.http.put<ShippingConfig>('/api/admin/shipping-config', { price, currency });
  }
}
