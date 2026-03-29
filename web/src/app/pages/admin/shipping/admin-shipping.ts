import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShippingService, ShippingConfig } from '../../../services/shipping.service';

@Component({
  selector: 'app-admin-shipping',
  standalone: true,
  imports: [],
  templateUrl: './admin-shipping.html',
  styleUrl: './admin-shipping.css',
})
export class AdminShipping {
  private shippingService = inject(ShippingService);
  private destroyRef = inject(DestroyRef);

  config = signal<ShippingConfig | null>(null);
  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);

  price = signal('');
  currency = signal('EUR');

  constructor() {
    this.shippingService.getShippingConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cfg) => {
          this.config.set(cfg);
          this.price.set(String(cfg.price));
          this.currency.set(cfg.currency);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load shipping config.');
          this.loading.set(false);
        },
      });
  }

  save(): void {
    const priceVal = parseFloat(this.price());
    if (isNaN(priceVal) || priceVal < 0) {
      this.error.set('Price must be a non-negative number.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.shippingService.updateShippingConfig(priceVal, this.currency())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cfg) => {
          this.config.set(cfg);
          this.saving.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2500);
        },
        error: () => {
          this.error.set('Failed to save shipping config.');
          this.saving.set(false);
        },
      });
  }
}
