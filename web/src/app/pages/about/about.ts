import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService, SocialLink } from '../../services/site.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private siteService = inject(SiteService);
  private destroyRef = inject(DestroyRef);

  socialLinks = signal<SocialLink[]>([]);

  constructor() {
    this.siteService.getSocialLinks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (links) => this.socialLinks.set(links.filter(l => l.enabled)),
        error: () => {},
      });
  }
}
