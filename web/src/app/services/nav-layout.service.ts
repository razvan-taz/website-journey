import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type NavZone = 'above-left' | 'above-center' | 'above-right' | 'below-left' | 'below-center' | 'below-right';

export interface NavLayoutItem {
  itemKey: string;
  zone: NavZone;
  sortOrder: number;
  heightPx: number | null;
  widthPx: number | null;
  offsetX: number;
  offsetY: number;
}

const DEFAULTS: NavLayoutItem[] = [
  { itemKey: 'logo',      zone: 'above-left',   sortOrder: 0, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
  { itemKey: 'live',      zone: 'above-left',   sortOrder: 1, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
  { itemKey: 'nav-links', zone: 'below-center', sortOrder: 0, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
  { itemKey: 'schedule',  zone: 'below-center', sortOrder: 1, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
  { itemKey: 'search',    zone: 'below-center', sortOrder: 2, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
  { itemKey: 'cart',      zone: 'above-right',  sortOrder: 0, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
  { itemKey: 'signin',    zone: 'above-right',  sortOrder: 1, heightPx: null, widthPx: null, offsetX: 0, offsetY: 0 },
];

@Injectable({ providedIn: 'root' })
export class NavLayoutService {
  private http = inject(HttpClient);

  navWidth = signal(1200);

  navLayout = signal<NavLayoutItem[]>(DEFAULTS);

  zoneItems(zone: NavZone): NavLayoutItem[] {
    return this.navLayout()
      .filter(i => i.zone === zone)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  loadNavLayout(): Observable<NavLayoutItem[]> {
    return this.http.get<NavLayoutItem[]>('/api/site/nav-layout').pipe(
      tap(items => this.navLayout.set(items))
    );
  }

  getAdminNavLayout(): Observable<NavLayoutItem[]> {
    return this.http.get<NavLayoutItem[]>('/api/admin/nav-layout');
  }

  saveNavLayout(items: NavLayoutItem[]): Observable<NavLayoutItem[]> {
    return this.http.put<NavLayoutItem[]>('/api/admin/nav-layout', items).pipe(
      tap(saved => this.navLayout.set(saved))
    );
  }
}
