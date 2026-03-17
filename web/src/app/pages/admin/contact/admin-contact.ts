import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactService, ContactMessage } from '../../../services/contact.service';

@Component({
  selector: 'app-admin-contact',
  standalone: true,
  imports: [],
  templateUrl: './admin-contact.html',
  styleUrl: './admin-contact.css',
})
export class AdminContact {
  private contactService = inject(ContactService);
  private destroyRef = inject(DestroyRef);

  messages = signal<ContactMessage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedMessage = signal<ContactMessage | null>(null);
  deleting = signal<number | null>(null);

  constructor() {
    this.contactService.getMessages(0, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.messages.set(response.content);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load messages.');
          this.loading.set(false);
        },
      });
  }

  selectMessage(msg: ContactMessage): void {
    this.selectedMessage.set(msg);
    if (!msg.read) {
      this.markRead(msg.id);
    }
  }

  back(): void {
    this.selectedMessage.set(null);
  }

  markRead(id: number): void {
    this.contactService.markRead(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.messages.update(list => list.map(m => m.id === id ? { ...m, read: true } : m));
          if (this.selectedMessage()?.id === id) {
            this.selectedMessage.set({ ...this.selectedMessage()!, read: true });
          }
        },
        error: () => {},
      });
  }

  deleteMessage(id: number): void {
    if (!confirm('Delete this message?')) return;
    this.deleting.set(id);
    this.contactService.deleteMessage(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messages.update(list => list.filter(m => m.id !== id));
          this.deleting.set(null);
          if (this.selectedMessage()?.id === id) {
            this.selectedMessage.set(null);
          }
        },
        error: () => {
          alert('Failed to delete.');
          this.deleting.set(null);
        },
      });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
