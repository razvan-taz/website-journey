import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductListItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}

export interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPageResponse {
  content: ProductListItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}

const BASE_URL = '/api/products';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);

  getProducts(page: number, size: number): Observable<ProductPageResponse> {
    return this.http.get<ProductPageResponse>(BASE_URL, {
      params: { page: page.toString(), size: size.toString() },
    });
  }

  getProductById(id: number): Observable<ProductDetail> {
    return this.http.get<ProductDetail>(`${BASE_URL}/${id}`);
  }

  createProduct(request: CreateProductRequest): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(BASE_URL, request);
  }

  updateProduct(id: number, request: CreateProductRequest): Observable<ProductDetail> {
    return this.http.put<ProductDetail>(`${BASE_URL}/${id}`, request);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
