import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReviewItem {
  id: number;
  productId: number;
  userName: string;
  body: string;
  createdAt: string;
}

export interface AdminReviewItem {
  id: number;
  productId: number;
  productName: string;
  userName: string;
  body: string;
  createdAt: string;
}

export interface AdminReviewPageResponse {
  content: AdminReviewItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ReviewSummary {
  totalReviews: number;
  reviews: ReviewItem[];
}

export interface SubmitReviewRequest {
  body: string;
}

export interface ReviewEligibility {
  canReview: boolean;
  hasReviewed: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);

  getReviews(productId: number): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`/api/products/${productId}/reviews`);
  }

  getEligibility(productId: number): Observable<ReviewEligibility> {
    return this.http.get<ReviewEligibility>(`/api/products/${productId}/reviews/eligibility`);
  }

  submitReview(productId: number, request: SubmitReviewRequest): Observable<ReviewItem> {
    return this.http.post<ReviewItem>(`/api/products/${productId}/reviews`, request);
  }

  deleteReview(productId: number): Observable<void> {
    return this.http.delete<void>(`/api/products/${productId}/reviews/mine`);
  }

  // ── Admin ────────────────────────────────────────────

  adminGetReviews(page: number, size: number): Observable<AdminReviewPageResponse> {
    return this.http.get<AdminReviewPageResponse>(`/api/admin/reviews?page=${page}&size=${size}`);
  }

  adminDeleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/reviews/${id}`);
  }
}
