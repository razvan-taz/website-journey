import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface User {
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  notificationsEnabled: boolean;
}

interface AuthResponse {
  token: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  notificationsEnabled?: boolean;
}

interface UserProfileResponse {
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  notificationsEnabled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private _token = signal<string | null>(null);
  private _currentUser = signal<User | null>(null);

  readonly isLoggedIn = computed(() => this._token() !== null);
  readonly currentUser = computed(() => this._currentUser());
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ADMIN');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this._token.set(savedToken);
      // Verify token is still valid by fetching profile.
      // Inline header is intentional — the auth interceptor can't be injected
      // at construction time without creating a circular dependency.
      this.http
        .get<UserProfileResponse>('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
        .subscribe({
          next: (profile) =>
            this._currentUser.set({ name: profile.name, email: profile.email, role: profile.role, emailVerified: profile.emailVerified ?? true, notificationsEnabled: profile.notificationsEnabled ?? true }),
          error: () => {
            this._token.set(null);
            localStorage.removeItem('auth_token');
          },
        });
    }
  }

  login(email: string, password: string): Observable<boolean> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((response) => {
          this._token.set(response.token);
          this._currentUser.set({ name: response.name, email: response.email, role: response.role, emailVerified: response.emailVerified ?? true, notificationsEnabled: response.notificationsEnabled ?? true });
          if (isPlatformBrowser(this.platformId)) localStorage.setItem('auth_token', response.token);
        }),
        map(() => true),
        catchError(() => of(false))
      );
  }

  register(name: string, email: string, password: string): Observable<boolean> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { name, email, password })
      .pipe(
        tap((response) => {
          this._token.set(response.token);
          this._currentUser.set({ name: response.name, email: response.email, role: response.role, emailVerified: response.emailVerified ?? false, notificationsEnabled: response.notificationsEnabled ?? true });
          if (isPlatformBrowser(this.platformId)) localStorage.setItem('auth_token', response.token);
        }),
        map(() => true),
        catchError(() => of(false))
      );
  }

  logout(): void {
    this._token.set(null);
    this._currentUser.set(null);
    if (isPlatformBrowser(this.platformId)) localStorage.removeItem('auth_token');
  }

  getToken(): string | null {
    return this._token();
  }

  /** Update stored user fields (e.g. after profile edit). */
  updateUser(partial: Partial<User>): void {
    const current = this._currentUser();
    if (current) this._currentUser.set({ ...current, ...partial });
  }

  resendVerification(): Observable<void> {
    return this.http.post<void>('/api/auth/resend-verification', {});
  }

  updateProfile(name: string): Observable<UserProfileResponse> {
    return this.http.put<UserProfileResponse>('/api/auth/profile', { name }).pipe(
      tap((res) => this.updateUser({ name: res.name }))
    );
  }
}
