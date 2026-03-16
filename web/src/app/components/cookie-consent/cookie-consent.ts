import { Component, signal, OnInit } from '@angular/core';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [],
  templateUrl: './cookie-consent.html',
  styleUrl: './cookie-consent.css',
})
export class CookieConsent implements OnInit {
  visible = signal(false);

  ngOnInit(): void {
    if (!localStorage.getItem('cookie-consent')) {
      this.visible.set(true);
    }
  }

  accept(): void {
    localStorage.setItem('cookie-consent', 'accepted');
    this.visible.set(false);
  }

  decline(): void {
    localStorage.setItem('cookie-consent', 'declined');
    this.visible.set(false);
  }
}
