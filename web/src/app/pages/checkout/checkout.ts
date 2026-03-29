import { Component, inject, signal, computed, OnDestroy, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { retry } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { CouponService, CouponValidationResult } from '../../services/coupon.service';
import { AddressService, Address } from '../../services/address.service';
import { AuthService } from '../../services/auth.service';
import { ShippingService } from '../../services/shipping.service';

declare const Stripe: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnDestroy {
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private couponService = inject(CouponService);
  private addressService = inject(AddressService);
  private authService = inject(AuthService);
  private shippingService = inject(ShippingService);
  private destroyRef = inject(DestroyRef);

  // ── Step ──────────────────────────────────────────
  step = signal<'shipping' | 'payment'>('shipping');

  // ── Shipping ──────────────────────────────────────
  name = signal('');
  line1 = signal('');
  city = signal('');
  state = signal('');
  zip = signal('');
  country = signal('US');

  // ── Saved addresses ────────────────────────────────
  savedAddresses = signal<Address[]>([]);
  useNewAddress = signal(false);

  // ── Shipping ──────────────────────────────────────
  shippingAmount = signal(0);
  shippingCurrency = signal('EUR');
  shippingLoaded = signal(false);

  // ── Coupon ────────────────────────────────────────
  couponCode = signal('');
  couponApplying = signal(false);
  couponError = signal<string | null>(null);
  appliedCoupon = signal<CouponValidationResult | null>(null);

  // ── State ─────────────────────────────────────────
  loading = signal(false);
  error = signal<string | null>(null);
  paymentReady = signal(false);
  orderSaveFailedRef = signal<string | null>(null); // payment intent ID when order save fails

  // ── Stripe internals ──────────────────────────────
  private stripe: any = null;
  private elements: any = null;
  private clientSecret: string | null = null;
  private mountTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // ── Computed ──────────────────────────────────────

  isFormValid = computed(() =>
    this.name().trim().length > 0 &&
    this.line1().trim().length > 0 &&
    this.city().trim().length > 0 &&
    this.state().trim().length > 0 &&
    this.zip().trim().length > 0
  );

  orderTotal = computed(() => {
    const subtotal = this.cartService.subtotal();
    const discount = this.appliedCoupon()?.discountAmount ?? 0;
    const shipping = this.appliedCoupon()?.freeShipping ? 0 : this.shippingAmount();
    return Math.max(0, subtotal - discount + shipping);
  });

  hasSavedAddresses = computed(() => this.savedAddresses().length > 0 && !this.useNewAddress());

  /** Masked payment intent reference shown to user on order-save failure */
  maskedPaymentRef = computed(() => {
    const ref = this.orderSaveFailedRef();
    if (!ref) return null;
    return ref.length > 8 ? `****${ref.slice(-8)}` : ref;
  });

  constructor() {
    // Load shipping rate
    this.shippingService.getShippingRate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rate) => {
          this.shippingAmount.set(rate.price);
          this.shippingCurrency.set(rate.currency);
          this.shippingLoaded.set(true);
        },
        error: () => this.shippingLoaded.set(true),
      });

    // Load saved addresses for authenticated users
    if (this.authService.currentUser()) {
      this.addressService.getAddresses()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.savedAddresses.set(list), error: () => {} });
    }
  }

  ngOnDestroy(): void {
    this.elements?.destroy();
    if (this.mountTimeoutId !== null) {
      clearTimeout(this.mountTimeoutId);
      this.mountTimeoutId = null;
    }
  }

  selectSavedAddress(address: Address): void {
    this.name.set(address.fullName);
    this.line1.set(address.line1);
    this.city.set(address.city);
    this.state.set(address.state);
    this.zip.set(address.postalCode);
    this.country.set(address.country);
  }

  // ── Coupon ────────────────────────────────────────
  applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code || this.couponApplying()) return;
    this.couponApplying.set(true);
    this.couponError.set(null);
    const cartItems = this.cartService.items().map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
    }));
    this.couponService.validateCoupon(code, cartItems)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.valid) {
            this.appliedCoupon.set({ ...res, discountAmount: res.discountAmount ?? 0 });
          } else {
            this.couponError.set(res.error ?? 'Invalid coupon code.');
          }
          this.couponApplying.set(false);
        },
        error: () => {
          this.couponError.set('Could not validate coupon. Please try again.');
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
        if (!publishableKey || typeof publishableKey !== 'string') {
          this.error.set('Payment service configuration invalid. Please try again.');
          this.loading.set(false);
          return;
        }

        this.stripe = Stripe(publishableKey);
        const amountInCents = Math.round(this.orderTotal() * 100);

        this.http.post<{ clientSecret: string }>('/api/payments/create-intent', {
          amount: amountInCents,
          currency: 'eur',
        }).subscribe({
          next: ({ clientSecret }) => {
            if (!clientSecret || typeof clientSecret !== 'string') {
              this.error.set('Could not initialise payment. Please try again.');
              this.loading.set(false);
              return;
            }

            this.clientSecret = clientSecret;
            this.elements = this.stripe.elements({ clientSecret, appearance: this.stripeAppearance() });
            const paymentEl = this.elements.create('payment');
            this.step.set('payment');
            this.loading.set(false);

            // Mount after Angular renders the payment step into the DOM
            this.mountTimeoutId = setTimeout(() => {
              this.mountTimeoutId = null;
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
      shippingAddress: {
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
      shippingAmount: this.appliedCoupon()?.freeShipping ? 0 : this.shippingAmount(),
      paymentIntentId,
    }).pipe(
      retry({ count: 2, delay: 1000 })
    ).subscribe({
      next: (confirmation) => {
        const items = this.cartService.items().map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }));
        this.cartService.clearCart();
        this.router.navigate(['/order-confirmation'], {
          state: { confirmation: { ...confirmation, items } },
        });
      },
      error: () => {
        // Payment succeeded but order save failed after retries — show persistent error with masked reference
        this.orderSaveFailedRef.set(paymentIntentId);
        this.loading.set(false);
      },
    });
  }

  goBackToShipping(): void {
    if (this.mountTimeoutId !== null) {
      clearTimeout(this.mountTimeoutId);
      this.mountTimeoutId = null;
    }
    this.elements?.destroy();
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
