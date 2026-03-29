import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Comment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  targetType: string;
  targetId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);

  getArticleComments(articleId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/articles/id/${articleId}/comments`);
  }

  getProductComments(productId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/products/${productId}/comments`);
  }

  addArticleComment(articleId: number, content: string): Observable<Comment> {
    return this.http.post<Comment>(`/api/articles/id/${articleId}/comments`, { content });
  }

  addProductComment(productId: number, content: string): Observable<Comment> {
    return this.http.post<Comment>(`/api/products/${productId}/comments`, { content });
  }

  editComment(commentId: number, content: string): Observable<Comment> {
    return this.http.put<Comment>(`/api/comments/${commentId}`, { content });
  }

  deleteOwnComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`/api/comments/${commentId}`);
  }

  // Admin
  getAdminComments(status?: string, page = 0, size = 20): Observable<any> {
    const params: Record<string, string> = { page: page.toString(), size: size.toString() };
    if (status) params['status'] = status;
    return this.http.get<any>('/api/admin/comments', { params });
  }

  approveComment(id: number): Observable<Comment> {
    return this.http.post<Comment>(`/api/admin/comments/${id}/approve`, {});
  }

  rejectComment(id: number): Observable<Comment> {
    return this.http.post<Comment>(`/api/admin/comments/${id}/reject`, {});
  }

  deleteComment(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/comments/${id}`);
  }
}
