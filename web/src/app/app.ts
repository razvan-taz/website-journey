import { Component, inject, signal, DestroyRef, HostListener } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SignInModal } from './components/sign-in-modal/sign-in-modal';
import { SearchOverlay } from './components/search-overlay/search-overlay';
import { CartDrawer } from './components/cart-drawer/cart-drawer';
import { CookieConsent } from './components/cookie-consent/cookie-consent';
import { ToastContainer } from './components/toast-container/toast-container';
import { Footer } from './components/footer/footer';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { UiStateService } from './services/ui-state.service';
import { SiteService, ScheduleEntry } from './services/site.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SignInModal, SearchOverlay, CartDrawer, CookieConsent, ToastContainer, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  authService = inject(AuthService);
  cartService = inject(CartService);
  uiState = inject(UiStateService);
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  showSearch = false;
  showCart = false;
  showSchedule = false;

  scheduleEntries = signal<ScheduleEntry[]>([]);
  twitchStatus = this.siteService.twitchStatus;

  constructor() {
    this.siteService.getSchedule()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => this.scheduleEntries.set(entries),
        error: () => {},
      });

    this.siteService.getTwitchStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showSchedule = false;
  }
}
