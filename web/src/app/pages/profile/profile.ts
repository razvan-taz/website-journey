import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SlicePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  user = this.authService.currentUser;
  isAdmin = this.authService.isAdmin;

  subscriptionStatus = signal<any | null>(null);
  orders = signal<any[]>([]);
  loadingOrders = signal(true);

  constructor() {
    // Load subscription status
    this.http.get<any>('/api/subscriptions/my-status')
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (s) => this.subscriptionStatus.set(s), error: () => {} });

    // Load order history
    this.http.get<any[]>('/api/orders/mine')
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (o) => { this.orders.set(o); this.loadingOrders.set(false); },
        error: () => this.loadingOrders.set(false)
      });
  }
}
