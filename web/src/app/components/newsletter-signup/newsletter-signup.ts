import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-newsletter-signup',
  standalone: true,
  imports: [],
  templateUrl: './newsletter-signup.html',
  styleUrl: './newsletter-signup.css',
})
export class NewsletterSignup {
  private http = inject(HttpClient);

  email = signal('');
  submitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    const email = this.email().trim();
    if (!email || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.http.post('/api/newsletter/subscribe', { email }).subscribe({
      next: () => { this.success.set(true); this.submitting.set(false); this.email.set(''); },
      error: (err) => {
        this.error.set(err.status === 409 ? 'You\'re already subscribed!' : 'Something went wrong. Try again.');
        this.submitting.set(false);
      },
    });
  }
}
