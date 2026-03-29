import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SearchService, SearchResult } from '../../services/search.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class SearchPage implements OnInit {
  private route = inject(ActivatedRoute);
  private searchService = inject(SearchService);
  private destroyRef = inject(DestroyRef);

  query = signal('');
  results = signal<SearchResult[]>([]);
  loading = signal(false);
  searched = signal(false);

  contentResults = computed(() => this.results().filter(r => r.type === 'content'));
  storeResults = computed(() => this.results().filter(r => r.type === 'store'));

  ngOnInit(): void {
    this.route.queryParamMap.pipe(
      tap(params => {
        const q = params.get('q') ?? '';
        this.query.set(q);
        this.loading.set(q.trim().length >= 2);
        this.searched.set(false);
      }),
      switchMap(params => {
        const q = params.get('q') ?? '';
        if (q.trim().length < 2) return of<SearchResult[]>([]);
        return this.searchService.search(q);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.results.set(results);
      this.loading.set(false);
      this.searched.set(true);
    });
  }
}
