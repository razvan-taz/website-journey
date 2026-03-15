import { Component, inject, signal, effect } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SignInModal } from './components/sign-in-modal/sign-in-modal';
import { SearchOverlay } from './components/search-overlay/search-overlay';
import { CartDrawer } from './components/cart-drawer/cart-drawer';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { SubscriptionService, SubscriptionStatus } from './services/subscription.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SignInModal, SearchOverlay, CartDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  authService = inject(AuthService);
  cartService = inject(CartService);
  private subscriptionService = inject(SubscriptionService);

  showSignIn = false;
  showSearch = false;
  showCart = false;

  subscriptionStatus = signal<SubscriptionStatus | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.subscriptionService.getMyStatus().subscribe({
          next: (status) => this.subscriptionStatus.set(status),
          error: () => this.subscriptionStatus.set(null),
        });
      } else {
        this.subscriptionStatus.set(null);
      }
    });
  }
}