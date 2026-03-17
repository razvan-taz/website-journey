import { Component, signal, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [],
  templateUrl: './cookie-consent.html',
  styleUrl: './cookie-consent.css',
})
export class CookieConsent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  visible = signal(false);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && !localStorage.getItem('cookie-consent')) {
      this.visible.set(true);
    }
  }

  accept(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cookie-consent', 'accepted');
    }
    this.visible.set(false);
  }

  decline(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cookie-consent', 'declined');
    }
    this.visible.set(false);
  }
}
