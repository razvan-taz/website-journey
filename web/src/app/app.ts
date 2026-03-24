import { Component, inject, signal, effect, DestroyRef, HostListener, ElementRef, afterNextRender } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SignInModal } from './components/sign-in-modal/sign-in-modal';
import { SearchOverlay } from './components/search-overlay/search-overlay';
import { CartDrawer } from './components/cart-drawer/cart-drawer';
import { CookieConsent } from './components/cookie-consent/cookie-consent';
import { ToastContainer } from './components/toast-container/toast-container';
import { Footer } from './components/footer/footer';
import { BreakingNewsBanner } from './components/breaking-news-banner/breaking-news-banner';
import { AuthService } from './services/auth.service';
import { CartService } from './services/cart.service';
import { UiStateService } from './services/ui-state.service';
import { SiteService, ScheduleEntry } from './services/site.service';
import { NavLayoutService, NavLayoutItem, NavZone } from './services/nav-layout.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SignInModal, SearchOverlay, CartDrawer, CookieConsent, ToastContainer, Footer, BreakingNewsBanner],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  authService = inject(AuthService);
  cartService = inject(CartService);
  uiState = inject(UiStateService);
  notificationService = inject(NotificationService);
  private siteService = inject(SiteService);
  private navLayoutService = inject(NavLayoutService);
  private destroyRef = inject(DestroyRef);
  private elRef = inject(ElementRef);

  showSearch = false;
  showCart = false;
  showSchedule = false;
  showMobileMenu = false;

  scheduleEntries = signal<ScheduleEntry[]>([]);
  liveStatus = this.siteService.liveStatus;

  constructor() {
    this.siteService.getSchedule()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => this.scheduleEntries.set(entries),
        error: () => {},
      });

    this.siteService.getLiveStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });

    this.navLayoutService.loadNavLayout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });

    afterNextRender(() => this.measureNav());

    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.notificationService.fetchUnreadCount();
      }
    });
  }

  private measureNav() {
    const nav = this.elRef.nativeElement.querySelector('nav');
    if (nav) this.navLayoutService.navWidth.set(nav.offsetWidth);
  }

  @HostListener('window:resize')
  onResize() { this.measureNav(); }

  zoneItems(zone: NavZone) {
    return this.navLayoutService.zoneItems(zone);
  }

  itemOffsetStyle(item: NavLayoutItem): { [key: string]: string } {
    const ox = item.offsetX ?? 0;
    const oy = item.offsetY ?? 0;
    if (!ox && !oy) return {};
    return { transform: `translate(${ox}px, ${-oy}px)` };
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showSchedule = false;
    this.showMobileMenu = false;
  }
}
