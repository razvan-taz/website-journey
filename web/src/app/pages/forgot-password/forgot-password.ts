import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private http = inject(HttpClient);

  email = signal('');
  submitting = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    const email = this.email().trim();
    if (!email || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);

    this.http.post('/api/auth/forgot-password', { email }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: () => {
        // Always show success to avoid revealing whether an email exists
        this.submitting.set(false);
        this.submitted.set(true);
      },
    });
  }
}
