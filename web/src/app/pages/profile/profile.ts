import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { RefundService } from '../../services/refund.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, SlicePipe, FormsModule],
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
  passwordError = signal<string | null>(null);
  passwordSuccess = signal(false);

  orders = signal<any[]>([]);
  loadingOrders = signal(true);

  // Live status overrides keyed by orderId
  liveStatuses = signal<Record<number, string>>({});

  // Notification preferences
  savingNotifPref = signal(false);
  notifPrefError = signal<string | null>(null);

  // Refund modal state
  refundingOrderId = signal<number | null>(null);
  refundReason = signal('');
  refundSubmitting = signal(false);
  refundError = signal<string | null>(null);
  refundedOrders = signal<Set<number>>(new Set());

  constructor() {
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
