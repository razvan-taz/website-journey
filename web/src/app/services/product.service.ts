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

export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  stock: number;
  priceModifier: number;
  attributes: Record<string, string>;
}

export interface ProductImage {
  id: number;
  url: string;
  displayOrder: number;
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
  variants?: ProductVariant[];
  additionalImages?: ProductImage[];
}

export interface VariantRequest {
  name: string;
  sku: string;
  stock: number;
  priceModifier: number;
  attributes: Record<string, string>;
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

  getProducts(page: number, size: number, category?: string, q?: string, sort?: string, inStock?: boolean): Observable<ProductPageResponse> {
    const params: Record<string, string> = { page: page.toString(), size: size.toString() };
    if (category && category !== 'All') {
      params['category'] = category;
    }
    if (q && q.trim()) {
      params['q'] = q.trim();
    }
    if (sort) {
      params['sort'] = sort;
    }
    if (inStock) {
      params['inStock'] = 'true';
    }
    return this.http.get<ProductPageResponse>(BASE_URL, { params });
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

  notifyWhenInStock(productId: number): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/${productId}/stock-notify`, {});
  }

  createVariant(productId: number, request: VariantRequest): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(`${BASE_URL}/${productId}/variants`, request);
  }

  updateVariant(productId: number, variantId: number, request: VariantRequest): Observable<ProductVariant> {
    return this.http.put<ProductVariant>(`${BASE_URL}/${productId}/variants/${variantId}`, request);
  }

  deleteVariant(productId: number, variantId: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${productId}/variants/${variantId}`);
  }

  addProductImage(productId: number, url: string): Observable<ProductDetail> {
    return this.http.post<ProductDetail>(`${BASE_URL}/${productId}/images`, { url });
  }

  deleteProductImage(productId: number, imageId: number): Observable<ProductDetail> {
    return this.http.delete<ProductDetail>(`${BASE_URL}/${productId}/images/${imageId}`);
  }

  reorderProductImages(productId: number, orderedIds: number[]): Observable<ProductDetail> {
    return this.http.put<ProductDetail>(`${BASE_URL}/${productId}/images/reorder`, { orderedIds });
  }
}
