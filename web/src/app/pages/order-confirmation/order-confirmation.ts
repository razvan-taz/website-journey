import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { OrderConfirmation as OrderConfirmationData } from '../../services/order.service';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.css',
})
export class OrderConfirmation implements OnInit {
  private router = inject(Router);
  confirmation = signal<OrderConfirmationData | null>(null);

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { confirmation?: OrderConfirmationData } | undefined;
    if (state?.confirmation) {
      this.confirmation.set(state.confirmation);
    } else {
      // Navigated directly without order state — redirect to store
      this.router.navigate(['/store']);
    }
  }
}
