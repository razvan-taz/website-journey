import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  position: number;
}

@Injectable({ providedIn: 'root' })
export class FaqService {
  private http = inject(HttpClient);

  getFaq(): Observable<FaqItem[]> {
    return this.http.get<FaqItem[]>('/api/site/faq');
  }

  getAdminFaq(): Observable<FaqItem[]> {
    return this.http.get<FaqItem[]>('/api/admin/faq');
  }

  createFaq(data: { question: string; answer: string }): Observable<FaqItem> {
    return this.http.post<FaqItem>('/api/admin/faq', data);
  }

  updateFaq(id: number, data: { question: string; answer: string }): Observable<FaqItem> {
    return this.http.put<FaqItem>(`/api/admin/faq/${id}`, data);
  }

  deleteFaq(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/faq/${id}`);
  }

  moveUp(id: number): Observable<FaqItem[]> {
    return this.http.put<FaqItem[]>(`/api/admin/faq/${id}/move-up`, {});
  }

  moveDown(id: number): Observable<FaqItem[]> {
    return this.http.put<FaqItem[]>(`/api/admin/faq/${id}/move-down`, {});
  }
}
