import { Component, inject, signal, DestroyRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService } from '../../services/site.service';

@Component({
  selector: 'app-tos',
  standalone: true,
  imports: [],
  templateUrl: './tos.html',
  styleUrl: './tos.css',
})
export class Tos {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);
  private titleService = inject(Title);

  content = signal('');
  loading = signal(true);

  constructor() {
    this.titleService.setTitle('Terms of Service | Journey');

    this.siteService.getPage('tos')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.content.set(page.content);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
