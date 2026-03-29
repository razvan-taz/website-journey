import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ArticleCategory = 'NEWS' | 'GUIDE' | 'ARTICLE' | 'VIDEO';

export interface ArticleListItem {
  id: number;
  title: string;
  slug: string;
  author: string;
  publishDate: string;
  thumbnailUrl: string;
  type: 'article' | 'video';
  tag: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  viewCount: number;
  scheduledAt: string | null;
  category: ArticleCategory | null;
  tags: string | null;
  readingTimeMinutes: number | null;
}

export interface ArticleSeo {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  publishDate: string;
  author: string;
}

export interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl: string;
  author: string;
  publishDate: string;
}

export interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  author: string;
  publishDate: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  type: 'article' | 'video';
  tag: string | null;
  body: string;
  breakingNews: boolean;
  createdAt: string;
  updatedAt: string;
  seo: ArticleSeo;
  relatedArticles: RelatedArticle[];
  accessDenied?: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  scheduledAt: string | null;
  category: ArticleCategory | null;
  tags: string | null;
  readingTimeMinutes: number | null;
}

export interface ArticlePageResponse {
  content: ArticleListItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateArticleRequest {
  title: string;
  body: string;
  slug: string;
  author: string;
  publishDate: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  type: string;
  tag: string | null;
  breakingNews: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  scheduledAt: string | null;
  category: ArticleCategory | null;
  tags: string | null;
}

const BASE_URL = '/api/articles';

@Injectable({
  providedIn: 'root',
})
export class ArticleService {
  private http = inject(HttpClient);

  getArticles(page: number, size: number, tag?: string, category?: ArticleCategory): Observable<ArticlePageResponse> {
    const params: Record<string, string> = { page: page.toString(), size: size.toString() };
    if (tag) params['tag'] = tag;
    if (category) params['category'] = category;
    return this.http.get<ArticlePageResponse>(BASE_URL, { params });
  }

  getArticlesAdmin(page: number, size: number, tag?: string, category?: ArticleCategory, status?: string): Observable<ArticlePageResponse> {
    const params: Record<string, string> = { page: page.toString(), size: size.toString() };
    if (tag) params['tag'] = tag;
    if (category) params['category'] = category;
    if (status) params['status'] = status;
    return this.http.get<ArticlePageResponse>(`${BASE_URL}/admin`, { params });
  }

  getArticleBySlugAdmin(slug: string): Observable<ArticleDetail> {
    return this.http.get<ArticleDetail>(`${BASE_URL}/admin/${slug}`);
  }

  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${BASE_URL}/tags`);
  }

  getArticleBySlug(slug: string): Observable<ArticleDetail> {
    return this.http.get<ArticleDetail>(`${BASE_URL}/${slug}`);
  }

  createArticle(request: CreateArticleRequest): Observable<ArticleDetail> {
    return this.http.post<ArticleDetail>(BASE_URL, request);
  }

  updateArticle(slug: string, request: CreateArticleRequest): Observable<ArticleDetail> {
    return this.http.put<ArticleDetail>(`${BASE_URL}/${slug}`, request);
  }

  deleteArticle(slug: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${slug}`);
  }
}
