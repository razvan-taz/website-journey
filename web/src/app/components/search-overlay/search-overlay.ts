import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Output,
  ViewChild,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, share, switchMap } from 'rxjs/operators';
import { SearchService, SearchResult } from '../../services/search.service';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './search-overlay.html',
  styleUrl: './search-overlay.css',
})
export class SearchOverlay {
  @Output() closed = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private searchService = inject(SearchService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  query = '';
  results: SearchResult[] = [];
  searching = signal(false);

  private inputSubject = new Subject<string>();

  constructor() {
    // Single shared debounced stream — both side-effects derive from the same timer
    const debounced$ = this.inputSubject.pipe(
      debounceTime(300),
      share()
    );

    debounced$.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.query = value;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { q: value.length > 0 ? value : null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    debounced$.pipe(
      switchMap((value) => {
        this.searching.set(value.trim().length >= 2);
        return this.searchService.search(value);
      }),
      takeUntilDestroyed()
    ).subscribe((results) => {
      this.results = results;
      this.searching.set(false);
    });

    afterNextRender(() => {
      const initialQuery = this.route.snapshot.queryParamMap.get('q');
      if (initialQuery) {
        this.query = initialQuery;
        this.searching.set(true);
        const sub = this.searchService.search(initialQuery).subscribe(results => {
          this.results = results;
          this.searching.set(false);
        });
        this.destroyRef.onDestroy(() => sub.unsubscribe());
        if (this.searchInput?.nativeElement) {
          this.searchInput.nativeElement.value = initialQuery;
        }
      }
      this.searchInput?.nativeElement.focus();
    });
  }

  get contentResults(): SearchResult[] {
    return this.results.filter(r => r.type === 'content');
  }

  get storeResults(): SearchResult[] {
    return this.results.filter(r => r.type === 'store');
  }

  onInput(value: string): void {
    this.inputSubject.next(value);
  }

  onResultClick(route: string): void {
    this.router.navigate([route], { queryParams: { q: null } });
    this.closed.emit();
  }

  close(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.closed.emit();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.close();
  }
}
