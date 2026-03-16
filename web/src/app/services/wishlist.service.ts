import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface WishlistItem {
  productId: number;
  name: string;
  imageUrl: string;
  price: number;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);

  wishlistedIds = signal<Set<number>>(new Set());

  load(): Observable<WishlistItem[]> {
    return this.http.get<WishlistItem[]>('/api/wishlist').pipe(
      tap(items => this.wishlistedIds.set(new Set(items.map(i => i.productId))))
    );
  }

  add(productId: number): Observable<void> {
    return this.http.post<void>(`/api/wishlist/${productId}`, {}).pipe(
      tap(() => this.wishlistedIds.update(s => new Set([...s, productId])))
    );
  }

  remove(productId: number): Observable<void> {
    return this.http.delete<void>(`/api/wishlist/${productId}`).pipe(
      tap(() => {
        this.wishlistedIds.update(s => {
          const next = new Set(s);
          next.delete(productId);
          return next;
        });
      })
    );
  }

  toggle(productId: number): Observable<void> {
    return this.wishlistedIds().has(productId) ? this.remove(productId) : this.add(productId);
  }

  isWishlisted(productId: number): boolean {
    return this.wishlistedIds().has(productId);
  }
}
