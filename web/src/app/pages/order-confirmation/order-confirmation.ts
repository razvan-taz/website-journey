import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  private wsService = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);

  confirmation = signal<OrderConfirmationData | null>(null);
  liveStatus = signal<string | null>(null);

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { confirmation?: OrderConfirmationData } | undefined;
    if (state?.confirmation) {
      this.confirmation.set(state.confirmation);
      this.subscribeToOrderStatus(state.confirmation.orderId);
    } else {
      // Navigated directly without order state — redirect to store
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
        error: () => {},
      });
  }

  get displayStatus(): string {
    const c = this.confirmation();
    return this.liveStatus() ?? c?.status ?? '';
  }
}
