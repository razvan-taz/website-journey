import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaqService, FaqItem } from '../../../services/faq.service';

@Component({
  selector: 'app-admin-faq',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-faq.html',
  styleUrl: './admin-faq.css',
})
export class AdminFaq {
  private faqService = inject(FaqService);
  private destroyRef = inject(DestroyRef);

  items = signal<FaqItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);

  editingId = signal<number | null>(null);
  editQuestion = signal('');
  editAnswer = signal('');

  addingNew = signal(false);
  newQuestion = signal('');
  newAnswer = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.faqService.getAdminFaq()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.items.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load FAQ.');
          this.loading.set(false);
        },
      });
  }

  startEdit(item: FaqItem): void {
    this.editingId.set(item.id);
    this.editQuestion.set(item.question);
    this.editAnswer.set(item.answer);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editQuestion.set('');
    this.editAnswer.set('');
  }

  saveEdit(): void {
    const id = this.editingId();
    if (id === null) return;
    this.saving.set(true);
    this.faqService.updateFaq(id, { question: this.editQuestion(), answer: this.editAnswer() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.items.update(list => list.map(i => i.id === id ? updated : i));
          this.cancelEdit();
          this.saving.set(false);
        },
        error: () => {
          alert('Failed to save.');
          this.saving.set(false);
        },
      });
  }

  startAdd(): void {
    this.addingNew.set(true);
    this.newQuestion.set('');
    this.newAnswer.set('');
  }

  cancelAdd(): void {
    this.addingNew.set(false);
    this.newQuestion.set('');
    this.newAnswer.set('');
  }

  saveNew(): void {
    if (!this.newQuestion().trim() || !this.newAnswer().trim()) return;
    this.saving.set(true);
    this.faqService.createFaq({ question: this.newQuestion(), answer: this.newAnswer() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelAdd();
          this.saving.set(false);
          this.loading.set(true);
          this.load();
        },
        error: () => {
          alert('Failed to create.');
          this.saving.set(false);
        },
      });
  }

  deleteItem(id: number): void {
    if (!confirm('Delete this question?')) return;
    this.faqService.deleteFaq(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.items.update(list => list.filter(i => i.id !== id)),
        error: () => alert('Failed to delete.'),
      });
  }

  moveUp(id: number): void {
    this.faqService.moveUp(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.items.set(updated),
        error: () => alert('Failed to reorder.'),
      });
  }

  moveDown(id: number): void {
    this.faqService.moveDown(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.items.set(updated),
        error: () => alert('Failed to reorder.'),
      });
  }
}
