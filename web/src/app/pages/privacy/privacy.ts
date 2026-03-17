import { Component, inject, signal, DestroyRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService } from '../../services/site.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
})
export class Privacy {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);
  private titleService = inject(Title);

  content = signal('');
  loading = signal(true);

  constructor() {
    this.titleService.setTitle('Privacy Policy | Journey');

    this.siteService.getPage('privacy')
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
