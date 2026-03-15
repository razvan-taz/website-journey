import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  type: 'content' | 'store';
  route: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);

  search(query: string): Observable<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }
    return this.http.get<SearchResult[]>(`/api/search`, {
      params: { q: query.trim() }
    }).pipe(
      catchError(() => of([]))
    );
  }
}
