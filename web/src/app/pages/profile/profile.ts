import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { RefundService } from '../../services/refund.service';
import { CartService } from '../../services/cart.service';
import { AddressService, Address, AddressRequest } from '../../services/address.service';

function passwordStrength(value: string): { score: number; label: string } {
  if (!value) return { score: 0, label: '' };
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value)) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
  return { score, label: labels[score] };
}

const EMPTY_ADDRESS_FORM = (): AddressRequest => ({
  label: '', fullName: '', line1: '', line2: null,
  city: '', state: '', postalCode: '', country: 'US', isDefault: false,
});

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private wsService = inject(WebSocketService);
  private destroyRef = inject(DestroyRef);
  private refundService = inject(RefundService);
  private cartService = inject(CartService);
  private addressService = inject(AddressService);

  user = this.authService.currentUser;
  isAdmin = this.authService.isAdmin;

  // Verification banner
  resendingVerification = signal(false);
  resendVerificationSuccess = signal(false);
  resendVerificationError = signal<string | null>(null);

  // Profile edit
  editingName = signal(false);
  editNameValue = signal('');
  savingName = signal(false);
  saveNameError = signal<string | null>(null);

  // Password change
  changingPassword = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  savingPassword = signal(false);
  newPasswordStrength = computed(() => passwordStrength(this.newPassword()));
  passwordError = signal<string | null>(null);
  passwordSuccess = signal(false);

  orders = signal<any[]>([]);
  loadingOrders = signal(true);

  // Live status overrides keyed by orderId
  liveStatuses = signal<Record<number, string>>({});

  // Notification preferences
  savingNotifPref = signal(false);
  notifPrefError = signal<string | null>(null);

  // Address book
  addresses = signal<Address[]>([]);
  loadingAddresses = signal(true);
  showAddressForm = signal(false);
  editingAddressId = signal<number | null>(null);
  addressForm = signal<AddressRequest>(EMPTY_ADDRESS_FORM());
  savingAddress = signal(false);
  addressFormError = signal<string | null>(null);

  // Account deletion
  showDeleteForm = signal(false);
  deletePassword = signal('');
  deletingAccount = signal(false);
  deleteError = signal<string | null>(null);

  // Refund modal state
  refundingOrderId = signal<number | null>(null);
  refundReason = signal('');
  refundSubmitting = signal(false);
  refundError = signal<string | null>(null);
  refundedOrders = signal<Set<number>>(new Set());

  constructor() {
    this.addressService.getAddresses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => { this.addresses.set(list); this.loadingAddresses.set(false); },
        error: () => this.loadingAddresses.set(false),
      });

    this.http.get<any[]>('/api/orders/mine')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (o) => {
          this.orders.set(o);
          this.loadingOrders.set(false);
          this.subscribeToOrderStatuses(o);
        },
        error: () => this.loadingOrders.set(false)
      });
  }

  private subscribeToOrderStatuses(orders: any[]): void {
    for (const order of orders) {
      this.wsService.orderStatus$(order.orderId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (payload) => {
            if (payload.orderId === order.orderId) {
              this.liveStatuses.update(current => ({
                ...current,
                [order.orderId]: payload.status,
              }));
            }
          },
          error: () => {},
        });
    }
  }

  openAddressForm(): void {
    this.addressForm.set(EMPTY_ADDRESS_FORM());
    this.editingAddressId.set(null);
    this.addressFormError.set(null);
    this.showAddressForm.set(true);
  }

  editAddress(address: Address): void {
    this.addressForm.set({
      label: address.label,
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    this.editingAddressId.set(address.id);
    this.addressFormError.set(null);
    this.showAddressForm.set(true);
  }

  cancelAddressForm(): void {
    this.showAddressForm.set(false);
    this.addressFormError.set(null);
  }

  updateAddressForm(field: keyof AddressRequest, value: any): void {
    this.addressForm.update(f => ({ ...f, [field]: value }));
  }

  saveAddress(): void {
    const form = this.addressForm();
    if (!form.label || !form.fullName || !form.line1 || !form.city || !form.state || !form.postalCode || !form.country) {
      this.addressFormError.set('Please fill in all required fields.');
      return;
    }
    if (this.savingAddress()) return;
    this.savingAddress.set(true);
    this.addressFormError.set(null);

    const id = this.editingAddressId();
    const op = id
      ? this.addressService.updateAddress(id, form)
      : this.addressService.createAddress(form);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        if (id) {
          this.addresses.update(list => list.map(a => a.id === id ? saved : a));
        } else {
          if (saved.isDefault) {
            this.addresses.update(list => list.map(a => ({ ...a, isDefault: false })));
          }
          this.addresses.update(list => [saved, ...list]);
        }
        this.savingAddress.set(false);
        this.cancelAddressForm();
      },
      error: (err) => {
        this.addressFormError.set(err?.error?.message ?? 'Failed to save address.');
        this.savingAddress.set(false);
      },
    });
  }

  deleteAddress(id: number): void {
    this.addressService.deleteAddress(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.addresses.update(list => list.filter(a => a.id !== id)),
        error: () => {},
      });
  }

  setDefaultAddress(id: number): void {
    this.addressService.setDefault(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.addresses.update(list => list.map(a => ({ ...a, isDefault: a.id === id }))),
        error: () => {},
      });
  }

  resendVerification(): void {
    if (this.resendingVerification()) return;
    this.resendingVerification.set(true);
    this.resendVerificationError.set(null);
    this.authService.resendVerification()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resendVerificationSuccess.set(true);
          this.resendingVerification.set(false);
        },
        error: () => {
          this.resendVerificationError.set('Failed to send. Please try again.');
          this.resendingVerification.set(false);
        },
      });
  }

  startEditName(): void {
    this.editNameValue.set(this.user()?.name ?? '');
    this.saveNameError.set(null);
    this.editingName.set(true);
  }

  cancelEditName(): void {
    this.editingName.set(false);
    this.saveNameError.set(null);
  }

  saveName(): void {
    const name = this.editNameValue().trim();
    if (!name || this.savingName()) return;
    this.savingName.set(true);
    this.saveNameError.set(null);
    this.authService.updateProfile(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editingName.set(false);
          this.savingName.set(false);
        },
        error: (err) => {
          this.saveNameError.set(err?.error?.message ?? 'Failed to save.');
          this.savingName.set(false);
        },
      });
  }

  startChangePassword(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
    this.changingPassword.set(true);
  }

  cancelChangePassword(): void {
    this.changingPassword.set(false);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);
  }

  savePassword(): void {
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('New passwords do not match.');
      return;
    }
    if (this.newPassword().length < 8) {
      this.passwordError.set('New password must be at least 8 characters.');
      return;
    }
    if (this.savingPassword()) return;
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.http.post('/api/auth/change-password', {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordSuccess.set(true);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      },
      error: (err) => {
        this.passwordError.set(err?.error?.message ?? 'Failed to change password.');
        this.savingPassword.set(false);
      },
    });
  }

  getDisplayStatus(order: any): string {
    return this.liveStatuses()[order.orderId] ?? order.status;
  }

  canRequestRefund(order: any): boolean {
    const status = this.getDisplayStatus(order);
    return (status === 'PAID' || status === 'DELIVERED') && !this.refundedOrders().has(order.orderId);
  }

  openRefundModal(orderId: number): void {
    this.refundingOrderId.set(orderId);
    this.refundReason.set('');
    this.refundError.set(null);
  }

  closeRefundModal(): void {
    this.refundingOrderId.set(null);
    this.refundReason.set('');
    this.refundError.set(null);
  }

  toggleNotifications(): void {
    const current = this.user()?.notificationsEnabled !== false;
    const newValue = !current;
    this.savingNotifPref.set(true);
    this.notifPrefError.set(null);
    this.http.put<void>('/api/notifications/preferences', { enabled: newValue })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.authService.updateUser({ notificationsEnabled: newValue });
          this.savingNotifPref.set(false);
        },
        error: () => {
          this.notifPrefError.set('Failed to update preference.');
          this.savingNotifPref.set(false);
        },
      });
  }

  cancelDeleteAccount(): void {
    this.showDeleteForm.set(false);
    this.deletePassword.set('');
    this.deleteError.set(null);
  }

  confirmDeleteAccount(): void {
    if (this.deletingAccount()) return;
    this.deletingAccount.set(true);
    this.deleteError.set(null);
    this.authService.deleteAccount(this.deletePassword())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.authService.logout();
          this.cartService.clearCart();
        },
        error: (err) => {
          this.deleteError.set(err?.error?.message ?? 'Failed to delete account. Check your password.');
          this.deletingAccount.set(false);
        },
      });
  }

  submitRefund(): void {
    const orderId = this.refundingOrderId();
    const reason = this.refundReason().trim();
    if (!orderId || !reason || this.refundSubmitting()) return;

    this.refundSubmitting.set(true);
    this.refundError.set(null);

    this.refundService.requestRefund(orderId, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.refundedOrders.update(set => new Set([...set, orderId]));
          this.refundSubmitting.set(false);
          this.closeRefundModal();
        },
        error: (err) => {
          this.refundError.set(
            err.status === 409 ? 'A refund request for this order already exists.' :
            err.error?.message ?? 'Failed to submit refund request. Please try again.'
          );
          this.refundSubmitting.set(false);
        },
      });
  }
}
