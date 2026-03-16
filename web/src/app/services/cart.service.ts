import { Injectable, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { SubscriptionService } from './subscription.service';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  isSubscription?: boolean;
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
  private subscriptionService = inject(SubscriptionService);

  private _items = signal<CartItem[]>([]);
  private _syncing = signal(false);

  private previousLoginState: boolean | null = null;

  // Primary source of truth: subscription productIds loaded from the API.
  private subscriptionPlanIds = new Set<number>();
  // Fallback: productIds that were explicitly flagged isSubscription: true by callers
  // (survives page refresh via localStorage for guest carts).
  private _subscriptionProductIds = new Set<number>();

  readonly items = this._items.asReadonly();
  readonly itemCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );
  readonly subtotal = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  readonly syncing = this._syncing.asReadonly();

  constructor() {
    // Load persisted fallback subscription IDs from localStorage.
    if (isPlatformBrowser(this.platformId)) {
      const savedSubIds = localStorage.getItem('subscription_product_ids');
      if (savedSubIds) {
        try { this._subscriptionProductIds = new Set(JSON.parse(savedSubIds)); } catch { /* ignore */ }
      }

      const saved = localStorage.getItem('cart');
      if (saved) {
        try { this._items.set(JSON.parse(saved)); } catch { /* ignore */ }
      }
    }

    // Load subscription plan IDs from the API.
    // Once loaded, re-hydrate item flags and clean up any stale multi-subscription data.
    this.subscriptionService.getPlans().subscribe({
      next: (plans) => {
        plans.forEach(p => {
          this.subscriptionPlanIds.add(p.productId);
          this._subscriptionProductIds.add(p.productId); // keep both in sync
        });
        this.persistSubscriptionIds();
        this.rehydrateAndCleanup();
      },
      error: () => {
        // Plans API failed — fall back to whatever is in _subscriptionProductIds.
        this.rehydrateAndCleanup();
      },
    });

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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isSubscriptionProduct(productId: number): boolean {
    return this.subscriptionPlanIds.has(productId) || this._subscriptionProductIds.has(productId);
  }

  /** Re-applies isSubscription flags and removes all but the last subscription if stale multiples exist. */
  private rehydrateAndCleanup(): void {
    const current = this._items();
    if (current.length === 0) return;

    const updated = current.map(item => ({
      ...item,
      isSubscription: this.isSubscriptionProduct(item.productId),
    }));

    const subs = updated.filter(i => i.isSubscription);
    if (subs.length > 1) {
      // Keep only the last subscription; delete the rest.
      const keepId = subs[subs.length - 1].productId;
      const toRemove = subs.filter(i => i.productId !== keepId);

      this._items.set(updated.filter(i => !i.isSubscription || i.productId === keepId));

      toRemove.forEach(i => this._subscriptionProductIds.delete(i.productId));
      this.persistSubscriptionIds();

      if (this.authService.isLoggedIn()) {
        // Delete the extras from the server cart so they don't come back on next load.
        toRemove.forEach(item => {
          this.http.delete(`/api/cart/items/${item.productId}`).subscribe();
        });
      } else if (isPlatformBrowser(this.platformId)) {
        this.persistLocally();
      }
    } else {
      this._items.set(updated);
      if (!this.authService.isLoggedIn() && isPlatformBrowser(this.platformId)) {
        this.persistLocally();
      }
    }
  }

  private persistSubscriptionIds(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('subscription_product_ids', JSON.stringify([...this._subscriptionProductIds]));
    }
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
          this.applyServerResponse(response);
          if (isPlatformBrowser(this.platformId)) localStorage.removeItem('cart');
          this._syncing.set(false);
          this.rehydrateAndCleanup();
        },
        error: () => this.loadFromServer(),
      });
    } else {
      this.loadFromServer();
    }
  }

  private onLogout(): void {
    this._items.set([]);
    this._subscriptionProductIds.clear();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('cart');
      localStorage.removeItem('subscription_product_ids');
    }
  }

  private loadFromServer(): void {
    this._syncing.set(true);
    this.http.get<ServerCartResponse>('/api/cart').subscribe({
      next: (response) => {
        this.applyServerResponse(response);
        this._syncing.set(false);
        this.rehydrateAndCleanup();
      },
      error: () => this._syncing.set(false),
    });
  }

  private applyServerResponse(response: ServerCartResponse): void {
    const items = response.items.map(item => ({
      ...item,
      isSubscription: this.isSubscriptionProduct(item.productId),
    }));
    this._items.set(items);
    // If the server returned multiple subscriptions (e.g. from a race condition or
    // pre-existing stale data), enforce the rule immediately.
    if (items.filter(i => i.isSubscription).length > 1) {
      this.rehydrateAndCleanup();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  addItem(product: { productId: number; name: string; price: number; imageUrl: string; isSubscription?: boolean }): void {
    const isSub = product.isSubscription || this.isSubscriptionProduct(product.productId);

    if (isSub) {
      // Check by both flag AND productId lookup — catches items added without the flag.
      const existingSub = this._items().find(i => i.isSubscription || this.isSubscriptionProduct(i.productId));

      // Already the exact same subscription in cart — nothing to do.
      if (existingSub && existingSub.productId === product.productId) return;

      // Track in both sets synchronously.
      this.subscriptionPlanIds.add(product.productId);
      this._subscriptionProductIds.add(product.productId);
      if (existingSub) {
        this._subscriptionProductIds.delete(existingSub.productId);
      }
      this.persistSubscriptionIds();

      // OPTIMISTIC UPDATE: replace the subscription in local state immediately,
      // before any HTTP call. This prevents race conditions from rapid clicks —
      // the next call to addItem will see the updated _items() and guard correctly.
      // Filter by both flag AND productId lookup so flag-less subscription items are removed too.
      this._items.set([
        ...this._items().filter(i => !i.isSubscription && !this.isSubscriptionProduct(i.productId)),
        { ...product, quantity: 1, isSubscription: true },
      ]);

      if (this.authService.isLoggedIn()) {
        if (existingSub) {
          this.http.delete<ServerCartResponse>(`/api/cart/items/${existingSub.productId}`).subscribe({
            next: () => this.addSubscriptionToServer(product.productId),
            error: () => this.addSubscriptionToServer(product.productId),
          });
        } else {
          this.addSubscriptionToServer(product.productId);
        }
      } else {
        this.persistLocally();
      }
      return;
    }

    // ── Non-subscription item ──────────────────────────────────────────────
    if (this.authService.isLoggedIn()) {
      this.http.post<ServerCartResponse>('/api/cart/items', {
        productId: product.productId,
        quantity: 1,
      }).subscribe({ next: (r) => this.applyServerResponse(r) });
    } else {
      const existing = this._items().find(i => i.productId === product.productId);
      if (existing) {
        this.updateQuantity(product.productId, existing.quantity + 1);
      } else {
        this._items.set([...this._items(), { ...product, quantity: 1 }]);
        this.persistLocally();
      }
    }
  }

  private addSubscriptionToServer(productId: number): void {
    this.http.post<ServerCartResponse>('/api/cart/items', { productId, quantity: 1 })
      .subscribe({ next: (r) => this.applyServerResponse(r) });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) { this.removeItem(productId); return; }

    const item = this._items().find(i => i.productId === productId);
    if (item?.isSubscription && quantity > 1) return;

    if (this.authService.isLoggedIn()) {
      this.http.put<ServerCartResponse>(`/api/cart/items/${productId}`, { quantity })
        .subscribe({ next: (r) => this.applyServerResponse(r) });
    } else {
      this._items.set(this._items().map(i =>
        i.productId === productId ? { ...i, quantity } : i
      ));
      this.persistLocally();
    }
  }

  removeItem(productId: number): void {
    if (this._subscriptionProductIds.has(productId)) {
      this._subscriptionProductIds.delete(productId);
      this.persistSubscriptionIds();
    }

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
      this._items().forEach(item => {
        this.http.delete(`/api/cart/items/${item.productId}`).subscribe();
      });
    } else {
      if (isPlatformBrowser(this.platformId)) localStorage.removeItem('cart');
    }
    this._subscriptionProductIds.clear();
    this.persistSubscriptionIds();
    this._items.set([]);
  }

  private persistLocally(): void {
    if (isPlatformBrowser(this.platformId)) localStorage.setItem('cart', JSON.stringify(this._items()));
  }
}
