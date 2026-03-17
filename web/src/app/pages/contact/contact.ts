import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private contactService = inject(ContactService);
  private destroyRef = inject(DestroyRef);

  name = signal('');
  email = signal('');
  message = signal('');
  submitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.name().trim() || !this.email().trim() || !this.message().trim()) {
      this.error.set('Please fill in all fields.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.contactService.submitContact({
      name: this.name(),
      email: this.email(),
      message: this.message(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.success.set(true);
          this.submitting.set(false);
        },
        error: () => {
          this.error.set('Failed to send message. Please try again.');
          this.submitting.set(false);
        },
      });
  }
}
