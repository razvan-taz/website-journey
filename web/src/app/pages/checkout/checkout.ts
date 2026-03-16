import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';

declare const Stripe: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  // ── Step ──────────────────────────────────────────
  step = signal<'shipping' | 'payment'>('shipping');

  // ── Shipping ──────────────────────────────────────
  name = signal('');
  line1 = signal('');
  city = signal('');
  state = signal('');
  zip = signal('');
  country = signal('US');

  // ── Coupon ────────────────────────────────────────
  couponCode = signal('');
  couponApplying = signal(false);
  couponError = signal<string | null>(null);
  appliedCoupon = signal<{ code: string; discountAmount: number } | null>(null);

  // ── State ─────────────────────────────────────────
  loading = signal(false);
  error = signal<string | null>(null);
  paymentReady = signal(false);

  // ── Stripe internals ──────────────────────────────
  private stripe: any = null;
  private elements: any = null;
  private clientSecret: string | null = null;

  // ── Computed ──────────────────────────────────────

  // True when every item in the cart is a subscription (no physical shipping needed).
  isSubscriptionOnly = computed(() =>
    this.cartService.items().length > 0 &&
    this.cartService.items().every(i => i.isSubscription)
  );

  isFormValid = computed(() =>
    this.isSubscriptionOnly() || (
      this.name().trim().length > 0 &&
      this.line1().trim().length > 0 &&
      this.city().trim().length > 0 &&
      this.state().trim().length > 0 &&
      this.zip().trim().length > 0
    )
  );

  orderTotal = computed(() => {
    const subtotal = this.cartService.subtotal();
    const discount = this.appliedCoupon()?.discountAmount ?? 0;
    return Math.max(0, subtotal - discount);
  });

  // ── Coupon ────────────────────────────────────────
  applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code || this.couponApplying()) return;
    this.couponApplying.set(true);
    this.couponError.set(null);
    this.http.get<{ code: string; discountAmount: number }>('/api/discount/validate', {
      params: { code, subtotal: this.cartService.subtotal().toString() }
    }).subscribe({
      next: (res) => { this.appliedCoupon.set(res); this.couponApplying.set(false); },
      error: (err) => {
        this.couponError.set(err.error?.message ?? 'Invalid coupon code.');
        this.couponApplying.set(false);
      },
    });
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponCode.set('');
    this.couponError.set(null);
  }

  // ── Step 1 → Step 2: create payment intent, mount Stripe ──
  continueToPayment(): void {
    if (!this.isFormValid() || this.loading()) return;
    if (this.cartService.items().length === 0) {
      this.error.set('Your cart is empty.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Fetch publishable key then create intent
    this.http.get<{ publishableKey: string }>('/api/payments/config').subscribe({
      next: ({ publishableKey }) => {
        this.stripe = Stripe(publishableKey);
        const amountInCents = Math.round(this.orderTotal() * 100);

        this.http.post<{ clientSecret: string }>('/api/payments/create-intent', {
          amount: amountInCents,
          currency: 'usd',
        }).subscribe({
          next: ({ clientSecret }) => {
            this.clientSecret = clientSecret;
            this.elements = this.stripe.elements({ clientSecret, appearance: this.stripeAppearance() });
            const paymentEl = this.elements.create('payment');
            this.step.set('payment');
            this.loading.set(false);

            // Mount after Angular renders the payment step into the DOM
            setTimeout(() => {
              const container = document.getElementById('stripe-payment-element');
              if (container) {
                paymentEl.mount(container);
                paymentEl.on('ready', () => this.paymentReady.set(true));
              }
            });
          },
          error: () => {
            this.error.set('Could not initialise payment. Please try again.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Payment service unavailable. Please try again.');
        this.loading.set(false);
      },
    });
  }

  // ── Step 2: confirm payment then place order ──
  async pay(): Promise<void> {
    if (!this.stripe || !this.elements || !this.clientSecret || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.origin + '/order-confirmation',
      },
      redirect: 'if_required',
    });

    if (error) {
      this.error.set(error.message ?? 'Payment failed. Please try again.');
      this.loading.set(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      this.placeOrder(paymentIntent.id);
    } else {
      this.error.set('Payment was not completed. Please try again.');
      this.loading.set(false);
    }
  }

  private placeOrder(paymentIntentId: string): void {
    this.orderService.placeOrder({
      items: this.cartService.items().map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingAddress: this.isSubscriptionOnly()
        ? { name: '', line1: '', city: '', state: '', zip: '', country: '' }
        : {
            name: this.name(),
            line1: this.line1(),
            city: this.city(),
            state: this.state(),
            zip: this.zip(),
            country: this.country(),
          },
      total: this.orderTotal(),
      discountCode: this.appliedCoupon()?.code ?? null,
      discountAmount: this.appliedCoupon()?.discountAmount ?? 0,
      paymentIntentId,
    }).subscribe({
      next: (confirmation) => {
        this.cartService.clearCart();
        this.router.navigate(['/order-confirmation'], { state: { confirmation } });
      },
      error: () => {
        // Payment succeeded but order save failed — critical edge case
        this.toast.error('Payment went through but we couldn\'t save your order. Contact support with reference: ' + paymentIntentId);
        this.loading.set(false);
      },
    });
  }

  goBackToShipping(): void {
    this.step.set('shipping');
    this.error.set(null);
    this.paymentReady.set(false);
    this.elements = null;
    this.clientSecret = null;
  }

  private stripeAppearance() {
    return {
      theme: 'night',
      variables: {
        colorPrimary: '#880824',
        colorBackground: '#2a2a2a',
        colorText: '#dadada',
        colorDanger: '#e05a70',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '4px',
      },
    };
  }
}
