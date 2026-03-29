import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CouponType =
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE'
  | 'PERCENTAGE_WITH_CAP'
  | 'PER_PRODUCT'
  | 'PER_CATEGORY'
  | 'FREE_SHIPPING'
  | 'FIRST_ORDER';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  type: CouponType | null;
  discountAmount: number;
  freeShipping: boolean;
  description: string | null;
  error: string | null;
}

export interface CartItemDto {
  productId: number;
  category?: string;
  quantity: number;
  unitPrice: number;
}

export interface Coupon {
  id: number;
  code: string;
  type: CouponType;
  value: number | null;
  cap: number | null;
  minOrderValue: number | null;
  targetProductId: number | null;
  targetCategory: string | null;
  freeShipping: boolean;
  firstOrderOnly: boolean;
  singleUse: boolean;
  usageLimit: number | null;
  perUserLimit: number | null;
  expiresAt: string | null;
  active: boolean;
  usageCount: number;
  createdAt: string;
}

export interface CouponRequest {
  code: string;
  type: CouponType;
  value?: number | null;
  cap?: number | null;
  minOrderValue?: number | null;
  targetProductId?: number | null;
  targetCategory?: string | null;
  freeShipping?: boolean;
  firstOrderOnly?: boolean;
  singleUse?: boolean;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  expiresAt?: string | null;
  active?: boolean;
}

export interface CouponPage {
  content: Coupon[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private http = inject(HttpClient);

  validateCoupon(code: string, cartItems: CartItemDto[]): Observable<CouponValidationResult> {
    return this.http.post<CouponValidationResult>('/api/coupons/validate', { code, cartItems });
  }

  getCoupons(page = 0, size = 20): Observable<CouponPage> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<CouponPage>('/api/admin/coupons', { params });
  }

  createCoupon(data: CouponRequest): Observable<Coupon> {
    return this.http.post<Coupon>('/api/admin/coupons', data);
  }

  updateCoupon(id: number, data: CouponRequest): Observable<Coupon> {
    return this.http.put<Coupon>(`/api/admin/coupons/${id}`, data);
  }

  deleteCoupon(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/coupons/${id}`);
  }
}
