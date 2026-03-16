import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  token = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  submitting = signal(false);
  done = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);
    if (!t) {
      this.error.set('Invalid or missing reset token. Please request a new link.');
    }
  }

  submit(): void {
    const newPassword = this.newPassword();
    const confirmPassword = this.confirmPassword();

    if (newPassword.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    if (this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    this.http.post('/api/auth/reset-password', {
      token: this.token(),
      newPassword,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
        this.toast.success('Password updated successfully. You can now sign in.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.message ?? 'This link has expired or is invalid. Please request a new one.');
      },
    });
  }
}
