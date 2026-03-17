import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ArticleListItem {
  id: number;
  title: string;
  slug: string;
  author: string;
  publishDate: string;
  thumbnailUrl: string;
  type: 'article' | 'video';
  tag: string;
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
  type: 'article' | 'video';
  tag: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  seo: ArticleSeo;
  relatedArticles: RelatedArticle[];
  accessDenied?: boolean;
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
  type: string;
  tag: string;
}

const BASE_URL = '/api/articles';

@Injectable({
  providedIn: 'root',
})
export class ArticleService {
  private http = inject(HttpClient);

  getArticles(page: number, size: number, tag?: string): Observable<ArticlePageResponse> {
    const params: Record<string, string> = { page: page.toString(), size: size.toString() };
    if (tag) params['tag'] = tag;
    return this.http.get<ArticlePageResponse>(BASE_URL, { params });
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
