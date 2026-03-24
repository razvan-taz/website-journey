import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

type VerifyState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  state = signal<VerifyState>('loading');
  resending = signal(false);
  resendSuccess = signal(false);
  resendError = signal<string | null>(null);

  readonly isLoggedIn = this.authService.isLoggedIn;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      return;
    }
    this.http.get<void>(`/api/auth/verify?token=${encodeURIComponent(token)}`).subscribe({
      next: () => {
        this.authService.updateUser({ emailVerified: true });
        this.state.set('success');
      },
      error: () => this.state.set('error'),
    });
  }

  resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.resendError.set(null);
    this.authService.resendVerification().subscribe({
      next: () => {
        this.resendSuccess.set(true);
        this.resending.set(false);
      },
      error: () => {
        this.resendError.set('Failed to resend. Please try again.');
        this.resending.set(false);
      },
    });
  }
}
