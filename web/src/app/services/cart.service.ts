import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
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

  private _items = signal<CartItem[]>([]);
  private _syncing = signal(false);

  // Tracks the previous login state to avoid wiping the guest cart on initial load.
  // null = first run (effect hasn't fired yet), false/true = previous known state.
  private previousLoginState: boolean | null = null;

  readonly items = this._items.asReadonly();
  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );
  readonly subtotal = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  readonly syncing = this._syncing.asReadonly();

  constructor() {
    // Load guest cart from localStorage before the effect runs,
    // so the initial onLogout() call (fired with isLoggedIn() = false) doesn't wipe it.
    const saved = localStorage.getItem('cart');
    if (saved) {
      try { this._items.set(JSON.parse(saved)); } catch { /* ignore malformed data */ }
    }

    effect(() => {
      const loggedIn = this.authService.isLoggedIn();

      // Skip if the state hasn't actually changed.
      if (this.previousLoginState === loggedIn) return;

      const wasLoggedIn = this.previousLoginState;
      this.previousLoginState = loggedIn;

      if (loggedIn) {
        this.onLogin();
      } else if (wasLoggedIn !== null) {
        // Only call onLogout() on a real transition from logged-in → logged-out,
        // not on the very first effect run where wasLoggedIn is null.
        this.onLogout();
      }
    });
  }

  private onLogin(): void {
    const guestItems = this._items();
    if (guestItems.length > 0) {
      // Merge guest cart into the server cart, then clear localStorage.
      this._syncing.set(true);
      this.http.post<ServerCartResponse>('/api/cart/merge', {
        items: guestItems.map(i => ({ productId: i.productId, quantity: i.quantity }))
      }).subscribe({
        next: (response) => {
          this.applyServerResponse(response);
          localStorage.removeItem('cart');
          this._syncing.set(false);
        },
        error: () => {
          // Merge failed — fall back to loading whatever is already on the server.
          this.loadFromServer();
        }
      });
    } else {
      this.loadFromServer();
    }
  }

  private onLogout(): void {
    // Clear server cart from memory; guest state starts empty.
    this._items.set([]);
    localStorage.removeItem('cart');
  }

  private loadFromServer(): void {
    this._syncing.set(true);
    this.http.get<ServerCartResponse>('/api/cart').subscribe({
      next: (response) => {
        this.applyServerResponse(response);
        this._syncing.set(false);
      },
      error: () => this._syncing.set(false)
    });
  }

  private applyServerResponse(response: ServerCartResponse): void {
    this._items.set(response.items);
  }

  addItem(product: { productId: number; name: string; price: number; imageUrl: string }): void {
    if (this.authService.isLoggedIn()) {
      this.http.post<ServerCartResponse>('/api/cart/items', {
        productId: product.productId,
        quantity: 1
      }).subscribe({ next: (r) => this.applyServerResponse(r) });
    } else {
      const items = this._items();
      const existing = items.find(i => i.productId === product.productId);
      if (existing) {
        this.updateQuantity(product.productId, existing.quantity + 1);
      } else {
        const updated = [...items, { ...product, quantity: 1 }];
        this._items.set(updated);
        this.persistLocally();
      }
    }
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) { this.removeItem(productId); return; }

    if (this.authService.isLoggedIn()) {
      this.http.put<ServerCartResponse>(`/api/cart/items/${productId}`, { quantity })
        .subscribe({ next: (r) => this.applyServerResponse(r) });
    } else {
      this._items.set(
        this._items().map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
      this.persistLocally();
    }
  }

  removeItem(productId: number): void {
    if (this.authService.isLoggedIn()) {
      this.http.delete<ServerCartResponse>(`/api/cart/items/${productId}`)
        .subscribe({ next: (r) => this.applyServerResponse(r) });
    } else {
      this._items.set(this._items().filter(i => i.productId !== productId));
      this.persistLocally();
    }
  }

  clearCart(): void {
    if (this.authService.isLoggedIn()) {
      // Fire a DELETE for each item to clear the server cart.
      // Called after successful order placement so the server cart doesn't
      // come back stale on the next load.
      const items = this._items();
      items.forEach(item => {
        this.http.delete(`/api/cart/items/${item.productId}`).subscribe();
      });
    } else {
      localStorage.removeItem('cart');
    }
    this._items.set([]);
  }

  private persistLocally(): void {
    localStorage.setItem('cart', JSON.stringify(this._items()));
  }
}
