import { Component, inject, signal, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CouponService, Coupon, CouponRequest, CouponType } from '../../../services/coupon.service';

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  FIXED_AMOUNT: 'Fixed Amount',
  PERCENTAGE: 'Percentage',
  PERCENTAGE_WITH_CAP: 'Percentage with Cap',
  PER_PRODUCT: 'Per Product',
  PER_CATEGORY: 'Per Category',
  FREE_SHIPPING: 'Free Shipping',
  FIRST_ORDER: 'First Order',
};

const EMPTY_FORM = (): CouponRequest & { id?: number } => ({
  code: '',
  type: 'FIXED_AMOUNT',
  value: null,
  cap: null,
  minOrderValue: null,
  targetProductId: null,
  targetCategory: null,
  freeShipping: false,
  firstOrderOnly: false,
  usageLimit: null,
  perUserLimit: null,
  expiresAt: null,
  active: true,
});

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-coupons.html',
  styleUrl: './admin-coupons.css',
})
export class AdminCoupons {
  private couponService = inject(CouponService);
  private destroyRef = inject(DestroyRef);

  coupons = signal<Coupon[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showForm = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);
  editingId = signal<number | null>(null);
  form = signal<CouponRequest & { id?: number }>(EMPTY_FORM());

  readonly typeLabels = COUPON_TYPE_LABELS;
  readonly allTypes = Object.keys(COUPON_TYPE_LABELS) as CouponType[];

  constructor() {
    this.loadCoupons();
  }

  private loadCoupons(): void {
    this.loading.set(true);
    this.couponService.getCoupons()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.coupons.set(page.content);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load coupons.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.form.set(EMPTY_FORM());
    this.editingId.set(null);
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEdit(coupon: Coupon): void {
    this.form.set({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      cap: coupon.cap,
      minOrderValue: coupon.minOrderValue,
      targetProductId: coupon.targetProductId,
      targetCategory: coupon.targetCategory,
      freeShipping: coupon.freeShipping,
      firstOrderOnly: coupon.firstOrderOnly,
      singleUse: coupon.singleUse,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      expiresAt: coupon.expiresAt,
      active: coupon.active,
    });
    this.editingId.set(coupon.id);
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formError.set(null);
  }

  updateForm(patch: Partial<CouponRequest>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  uppercaseCode(value: string): void {
    this.form.update(f => ({ ...f, code: value.toUpperCase() }));
  }

  needsValue(): boolean {
    const t = this.form().type;
    return t !== 'FREE_SHIPPING';
  }

  needsCap(): boolean {
    return this.form().type === 'PERCENTAGE_WITH_CAP';
  }

  needsProduct(): boolean {
    return this.form().type === 'PER_PRODUCT';
  }

  needsCategory(): boolean {
    return this.form().type === 'PER_CATEGORY';
  }

  get minExpiryDateTime(): string {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  }

  save(): void {
    const f = this.form();
    if (!f.code || !f.type || this.saving()) return;
    if (this.needsValue() && (f.value == null || f.value <= 0)) {
      this.formError.set('Value is required for this coupon type.');
      return;
    }
    if (f.expiresAt && new Date(f.expiresAt) <= new Date()) {
      this.formError.set('Expiry date must be in the future.');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);

    const request: CouponRequest = { ...f, singleUse: f.perUserLimit === 1 };
    const op = this.editingId()
      ? this.couponService.updateCoupon(this.editingId()!, request)
      : this.couponService.createCoupon(request);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        const id = this.editingId();
        if (id) {
          this.coupons.update(list => list.map(c => c.id === id ? { ...c, ...saved } : c));
        } else {
          this.coupons.update(list => [{ ...saved, usageCount: 0 } as Coupon, ...list]);
        }
        this.saving.set(false);
        this.closeForm();
      },
      error: (err) => {
        this.formError.set(err?.error?.message ?? 'Failed to save coupon.');
        this.saving.set(false);
      },
    });
  }

  deleteCoupon(coupon: Coupon): void {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    this.couponService.deleteCoupon(coupon.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.coupons.update(list => list.filter(c => c.id !== coupon.id)),
        error: () => alert('Failed to delete coupon.'),
      });
  }

  toggleActive(coupon: Coupon): void {
    const request: CouponRequest = {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      cap: coupon.cap,
      minOrderValue: coupon.minOrderValue,
      targetProductId: coupon.targetProductId,
      targetCategory: coupon.targetCategory,
      freeShipping: coupon.freeShipping,
      firstOrderOnly: coupon.firstOrderOnly,
      singleUse: coupon.singleUse,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      expiresAt: coupon.expiresAt,
      active: !coupon.active,
    };
    this.couponService.updateCoupon(coupon.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.coupons.update(list => list.map(c => c.id === coupon.id ? { ...c, active: saved.active } : c));
        },
        error: () => {},
      });
  }

  typeLabel(type: CouponType): string {
    return COUPON_TYPE_LABELS[type] ?? type;
  }
}
