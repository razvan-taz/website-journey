import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Skip 401 on the auth endpoints themselves (login/register/me)
        // to avoid redirect loops
        const isAuthEndpoint = req.url.includes('/api/auth/');
        if (!isAuthEndpoint && authService.isLoggedIn()) {
          authService.logout();
          router.navigate(['/']);
        }
      }
      return throwError(() => error);
    })
  );
};
