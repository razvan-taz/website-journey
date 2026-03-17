import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ContactPageResponse {
  content: ContactMessage[];
  totalElements: number;
  totalPages: number;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);

  submitContact(data: { name: string; email: string; message: string }): Observable<void> {
    return this.http.post<void>('/api/contact', data);
  }

  getMessages(page: number, size: number): Observable<ContactPageResponse> {
    return this.http.get<ContactPageResponse>(`/api/admin/contact-messages?page=${page}&size=${size}`);
  }

  markRead(id: number): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(`/api/admin/contact-messages/${id}/read`, {});
  }

  deleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/contact-messages/${id}`);
  }
}
