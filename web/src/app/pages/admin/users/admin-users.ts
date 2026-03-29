import { Component, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

export interface AdminUserDto {
  id: number;
  email: string;
  name: string;
  role: string;
  enabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  orderCount: number;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);

  readonly currentUserEmail = this.authService.currentUser()?.email;

  users = signal<AdminUserDto[]>([]);
  loading = signal(true);
  totalElements = signal(0);
  page = signal(0);
  readonly pageSize = 20;

  searchQuery = signal('');
  private searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        this.loading.set(true);
        this.page.set(0);
        return this.fetchUsers(q, 0);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => this.applyResponse(res));

    this.loadPage(0);
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  loadPage(p: number): void {
    this.page.set(p);
    this.loading.set(true);
    this.fetchUsers(this.searchQuery(), p)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => this.applyResponse(res));
  }

  private fetchUsers(search: string, page: number) {
    const params: Record<string, string> = { page: String(page), size: String(this.pageSize) };
    if (search.trim()) params['search'] = search.trim();
    return this.http.get<PageResponse<AdminUserDto>>('/api/admin/users', { params });
  }

  private applyResponse(res: PageResponse<AdminUserDto>): void {
    this.users.set(res.content);
    this.totalElements.set(res.totalElements);
    this.loading.set(false);
  }

  isCurrentUser(user: AdminUserDto): boolean {
    return user.email === this.currentUserEmail;
  }

  toggleEnabled(user: AdminUserDto): void {
    this.http.patch<AdminUserDto>(`/api/admin/users/${user.id}/enabled`, { enabled: !user.enabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => this.users.update(list => list.map(u => u.id === updated.id ? updated : u)),
        error: err => alert(err?.error?.message ?? 'Failed to update user.'),
      });
  }

  toggleRole(user: AdminUserDto): void {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    this.http.patch<AdminUserDto>(`/api/admin/users/${user.id}/role`, { role: newRole })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(updated => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
      });
  }

  get totalPages(): number {
    return Math.ceil(this.totalElements() / this.pageSize);
  }
}
