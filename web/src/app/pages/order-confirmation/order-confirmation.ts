import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderConfirmation as OrderConfirmationData } from '../../services/order.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.css',
})
export class OrderConfirmation implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private wsService = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);

  confirmation = signal<OrderConfirmationData | null>(null);
  liveStatus = signal<string | null>(null);
  /** True when a 3DS redirect landed here — payment succeeded but order was handled by webhook */
  paymentVerifying = signal(false);
  /** True when a 3DS redirect landed here with a non-success status */
  paymentRedirectFailed = signal(false);

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { confirmation?: OrderConfirmationData } | undefined;

    if (state?.confirmation) {
      this.confirmation.set(state.confirmation);
      this.subscribeToOrderStatus(state.confirmation.orderId);
      return;
    }

    // Check for Stripe 3DS redirect query params
    const params = this.route.snapshot.queryParams;
    const redirectStatus = params['redirect_status'];
    const paymentIntent = params['payment_intent'];
    const PI_FORMAT = /^pi_[a-zA-Z0-9]+$/;
    const validIntent = paymentIntent && PI_FORMAT.test(paymentIntent);

    if (validIntent && redirectStatus === 'succeeded') {
      // Payment went through via 3DS redirect — backend webhook handles the order
      this.paymentVerifying.set(true);
    } else if (validIntent && redirectStatus) {
      // 3DS returned but payment failed or was cancelled
      this.paymentRedirectFailed.set(true);
    } else if (paymentIntent && !validIntent) {
      // payment_intent param present but fails format check — send back to checkout
      this.router.navigate(['/checkout']);
    } else {
      // Navigated directly without any order context — redirect to store
      this.router.navigate(['/store']);
    }
  }

  private subscribeToOrderStatus(orderId: number): void {
    this.wsService.orderStatus$(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          if (payload.orderId === orderId) {
            this.liveStatus.set(payload.status);
          }
        },
        error: (err) => console.error('Order status WebSocket subscription failed:', err),
      });
  }

  get displayStatus(): string {
    const c = this.confirmation();
    return this.liveStatus() ?? c?.status ?? '';
  }
}
