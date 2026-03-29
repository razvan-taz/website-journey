import { Injectable, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  variantId?: number;
  variantName?: string;
}

interface ServerCartResponse {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  private _items = signal<CartItem[]>([]);
  private _syncing = signal(false);

  private previousLoginState: boolean | null = null;

  /** Emits when an unverified user tries to add to cart. Subscribe for modal trigger. */
  readonly unverifiedAddAttempt$ = new Subject<void>();

  /** Emits when guest cart items are successfully merged into the authenticated cart. */
  readonly guestCartMerged$ = new Subject<number>();

  readonly items = this._items.asReadonly();
  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );
  readonly subtotal = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  readonly syncing = this._syncing.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('cart');
      if (saved) {
        try { this._items.set(JSON.parse(saved)); } catch { /* ignore */ }
      }
    }

    effect(() => {
      const loggedIn = this.authService.isLoggedIn();
      if (this.previousLoginState === loggedIn) return;
      const wasLoggedIn = this.previousLoginState;
      this.previousLoginState = loggedIn;
      if (loggedIn) {
        this.onLogin();
      } else if (wasLoggedIn !== null) {
        this.onLogout();
      }
    });
  }

  // ── Login / Logout ────────────────────────────────────────────────────────

  private onLogin(): void {
    const guestItems = this._items();
    if (guestItems.length > 0) {
      this._syncing.set(true);
      this.http.post<ServerCartResponse>('/api/cart/merge', {
        items: guestItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
      }).subscribe({
        next: (response) => {
          this._items.set(response.items);
          if (isPlatformBrowser(this.platformId)) localStorage.removeItem('cart');
          this._syncing.set(false);
          this.guestCartMerged$.next(guestItems.length);
        },
        error: () => this.loadFromServer(),
      });
    } else {
      this.loadFromServer();
    }
  }

  private onLogout(): void {
    this._items.set([]);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('cart');
    }
  }

  private loadFromServer(): void {
    this._syncing.set(true);
    this.http.get<ServerCartResponse>('/api/cart').subscribe({
      next: (response) => {
        this._items.set(response.items);
        this._syncing.set(false);
      },
      error: () => this._syncing.set(false),
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  addItem(product: { productId: number; name: string; price: number; imageUrl: string; variantId?: number; variantName?: string }): void {
    // Block unverified users from adding to cart
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.emailVerified === false) {
      this.unverifiedAddAttempt$.next();
      return;
    }
    if (this.authService.isLoggedIn()) {
      this.http.post<ServerCartResponse>('/api/cart/items', {
        productId: product.productId,
        variantId: product.variantId ?? null,
        quantity: 1,
      }).subscribe({ next: (r) => this._items.set(r.items) });
    } else {
      const existing = this._items().find(i =>
        i.productId === product.productId && (i.variantId ?? null) === (product.variantId ?? null)
      );
      if (existing) {
        this.updateQuantity(product.productId, existing.quantity + 1, product.variantId);
      } else {
        this._items.set([...this._items(), { ...product, quantity: 1 }]);
        this.persistLocally();
      }
    }
  }

  updateQuantity(productId: number, quantity: number, variantId?: number): void {
    if (quantity <= 0) { this.removeItem(productId, variantId); return; }

    if (this.authService.isLoggedIn()) {
      this.http.put<ServerCartResponse>(`/api/cart/items/${productId}`, { quantity, variantId: variantId ?? null })
        .subscribe({ next: (r) => this._items.set(r.items) });
    } else {
      this._items.set(this._items().map(i =>
        i.productId === productId && (i.variantId ?? null) === (variantId ?? null) ? { ...i, quantity } : i
      ));
      this.persistLocally();
    }
  }

  removeItem(productId: number, variantId?: number): void {
    if (this.authService.isLoggedIn()) {
      const params = variantId != null ? `?variantId=${variantId}` : '';
      this.http.delete<ServerCartResponse>(`/api/cart/items/${productId}${params}`)
        .subscribe({ next: (r) => this._items.set(r.items) });
    } else {
      this._items.set(this._items().filter(i =>
        !(i.productId === productId && (i.variantId ?? null) === (variantId ?? null))
      ));
      this.persistLocally();
    }
  }

  clearCart(): void {
    if (this.authService.isLoggedIn()) {
      const itemsToRemove = this._items();
      this._items.set([]);
      itemsToRemove.forEach(item => this.removeItem(item.productId, item.variantId));
    } else {
      if (isPlatformBrowser(this.platformId)) localStorage.removeItem('cart');
      this._items.set([]);
    }
  }

  private persistLocally(): void {
    if (isPlatformBrowser(this.platformId)) localStorage.setItem('cart', JSON.stringify(this._items()));
  }
}
