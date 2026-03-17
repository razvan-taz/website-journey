import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaqService, FaqItem } from '../../services/faq.service';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq {
  private faqService = inject(FaqService);
  private destroyRef = inject(DestroyRef);

  items = signal<FaqItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  openItem = signal<number | null>(null);

  constructor() {
    this.faqService.getFaq()
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

  toggle(id: number): void {
    this.openItem.set(this.openItem() === id ? null : id);
  }
}
